import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Server, Socket } from 'socket.io';
import { User } from 'src/schema/user.schema';
import { ChatService } from './chat.service';

interface ChatSocket extends Socket {
  data: { userId?: string };
}

interface SendMessagePayload {
  recipientId: string;
  content: string;
}

interface PresencePayload {
  userIds: string[];
}

const userRoom = (userId: string) => `user:${userId}`;

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
      : ['http://localhost:5173', 'https://researcher-hub.onrender.com'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  private readonly connectionsByUser = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async handleConnection(client: ChatSocket) {
    try {
      const token = this.getToken(client);
      if (!token) throw new Error('Missing access token');

      const payload = await this.jwtService.verifyAsync<{ sub?: string }>(
        token,
      );
      if (!payload.sub || !Types.ObjectId.isValid(payload.sub)) {
        throw new Error('Invalid access token');
      }
      const exists = await this.userModel.exists({ _id: payload.sub });
      if (!exists) throw new Error('User not found');

      const userId = payload.sub;
      client.data.userId = userId;
      await client.join(userRoom(userId));

      const connections =
        this.connectionsByUser.get(userId) ?? new Set<string>();
      const becameOnline = connections.size === 0;
      connections.add(client.id);
      this.connectionsByUser.set(userId, connections);

      client.emit('chat:ready', { userId });
      if (becameOnline) this.server.emit('presence:online', { userId });
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: ChatSocket) {
    const userId = client.data.userId;
    if (!userId) return;

    const connections = this.connectionsByUser.get(userId);
    connections?.delete(client.id);
    if (connections?.size === 0) {
      this.connectionsByUser.delete(userId);
      this.server.emit('presence:offline', { userId });
    }
  }

  @SubscribeMessage('chat:send')
  async sendMessage(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() payload: SendMessagePayload,
  ) {
    const senderId = client.data.userId;
    if (!senderId) return;

    try {
      const message = await this.chatService.saveMessage(
        senderId,
        payload?.recipientId,
        payload?.content,
      );
      const data = message.toJSON();
      this.server
        .to(userRoom(senderId))
        .to(userRoom(payload.recipientId))
        .emit('chat:message', data);
      client.emit('chat:sent', { messageId: message._id });
    } catch (error) {
      client.emit('chat:error', {
        event: 'chat:send',
        message:
          error instanceof Error ? error.message : 'Unable to send message',
      });
    }
  }

  @SubscribeMessage('typing:start')
  startTyping(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() payload: { recipientId: string },
  ) {
    this.broadcastTyping(client, payload?.recipientId, true);
  }

  @SubscribeMessage('typing:stop')
  stopTyping(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() payload: { recipientId: string },
  ) {
    this.broadcastTyping(client, payload?.recipientId, false);
  }

  @SubscribeMessage('presence:check')
  checkPresence(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() payload: PresencePayload,
  ) {
    const userIds = Array.isArray(payload?.userIds)
      ? payload.userIds.slice(0, 100).filter((id) => Types.ObjectId.isValid(id))
      : [];
    const statuses = Object.fromEntries(
      userIds.map((userId) => [userId, this.connectionsByUser.has(userId)]),
    );
    client.emit('presence:status', statuses);
  }

  private broadcastTyping(
    client: ChatSocket,
    recipientId: string,
    isTyping: boolean,
  ) {
    const senderId = client.data.userId;
    if (
      !senderId ||
      !recipientId ||
      !Types.ObjectId.isValid(recipientId) ||
      recipientId === senderId
    ) {
      return;
    }
    this.server.to(userRoom(recipientId)).emit('chat:typing', {
      userId: senderId,
      isTyping,
    });
  }

  private getToken(client: ChatSocket): string | undefined {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const authToken = auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.replace(/^Bearer\s+/i, '').trim();
    }

    const authorization = client.handshake.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length).trim();
    }

    const cookies = client.handshake.headers.cookie?.split(';') ?? [];
    const accessTokenCookie = cookies.find((cookie) =>
      cookie.trim().startsWith('accessToken='),
    );
    if (!accessTokenCookie) return undefined;
    return decodeURIComponent(
      accessTokenCookie.trim().slice('accessToken='.length),
    );
  }
}
