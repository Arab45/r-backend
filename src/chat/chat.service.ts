import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Chat } from '../schema/chat.schema';
import { Follow } from '../schema/follow.schema';
import { Message, MessageAttachment } from '../schema/message.schema';
import { User } from '../schema/user.schema';
import {
  ChatAttachmentService,
  ChatUploadedFile,
} from './chat-attachment.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private readonly chatModel: Model<Chat>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @InjectModel(Follow.name) private readonly followModel: Model<Follow>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly attachmentService: ChatAttachmentService,
  ) {}

  async createChat(userId: string, recipientId: string) {
    this.assertObjectId(userId);
    this.assertObjectId(recipientId);
    if (userId === recipientId) {
      throw new BadRequestException('You cannot start a chat with yourself');
    }

    const recipient = await this.userModel.exists({ _id: recipientId });
    if (!recipient) throw new NotFoundException('User not found');
    await this.assertFollowRelationship(userId, recipientId);

    const [participantOne, participantTwo] = [userId, recipientId].sort();
    const participantKey = `${participantOne}:${participantTwo}`;
    const chat = await this.chatModel
      .findOneAndUpdate(
        { participantKey },
        {
          $setOnInsert: {
            participantKey,
            participants: [
              new Types.ObjectId(participantOne),
              new Types.ObjectId(participantTwo),
            ],
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .populate('participants', 'fullName username profilePicture role')
      .exec();
    return chat;
  }

  async getChats(userId: string) {
    this.assertObjectId(userId);
    return this.chatModel
      .find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate('participants', 'fullName username profilePicture role')
      .populate({
        path: 'lastMessage',
        populate: [
          {
            path: 'sender',
            select: 'fullName username profilePicture role',
          },
          {
            path: 'recipient',
            select: 'fullName username profilePicture role',
          },
        ],
      })
      .exec();
  }

  async getChatById(userId: string, chatId: string) {
    const chat = await this.findChatForMember(userId, chatId);
    return chat.populate(
      'participants',
      'fullName username profilePicture role',
    );
  }

  async sendChatMessage(
    userId: string,
    chatId: string,
    content: string | undefined,
    files: ChatUploadedFile[] = [],
  ) {
    const chat = await this.findChatForMember(userId, chatId);
    const recipientId = chat.participants.find(
      (participant) => participant.toString() !== userId,
    );
    if (!recipientId) throw new NotFoundException('Chat not found');

    await this.assertFollowRelationship(userId, recipientId.toString());
    const messageContent = content?.trim() ?? '';
    if (!messageContent && files.length === 0) {
      throw new BadRequestException(
        'A message must contain text or at least one attachment',
      );
    }
    if (messageContent.length > 5000) {
      throw new BadRequestException('Message cannot exceed 5000 characters');
    }

    const attachments = await this.attachmentService.uploadFiles(files);
    let message: Message;
    try {
      message = await this.createMessage(
        userId,
        recipientId.toString(),
        chat._id,
        messageContent,
        attachments,
      );
    } catch (error) {
      await this.attachmentService.deleteFiles(attachments);
      throw error;
    }
    chat.lastMessage = message._id;
    await chat.save();
    return message.populate(
      'sender recipient',
      'fullName username profilePicture role',
    );
  }

  async getMessages(userId: string, chatId: string, page = 1, limit = 50) {
    const chat = await this.findChatForMember(userId, chatId);
    const otherParticipant = chat.participants.find(
      (participant) => participant.toString() !== userId,
    );
    if (!otherParticipant) throw new NotFoundException('Chat not found');

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const otherUserId = otherParticipant.toString();
    const filter = {
      sender: { $in: [userId, otherUserId] },
      recipient: { $in: [userId, otherUserId] },
    };
    const [messages, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate('sender recipient', 'fullName username profilePicture role')
        .exec(),
      this.messageModel.countDocuments(filter).exec(),
    ]);
    return {
      messages: messages.reverse(),
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async getUnreadMessages(userId: string, page = 1, limit = 50) {
    this.assertObjectId(userId);
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const filter = { recipient: userId, readAt: null };
    const [messages, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .populate('sender recipient', 'fullName username profilePicture role')
        .exec(),
      this.messageModel.countDocuments(filter).exec(),
    ]);
    return { messages, total, page: safePage, limit: safeLimit };
  }

  async getUnreadCounts(userId: string) {
    this.assertObjectId(userId);
    const counts = await this.messageModel
      .aggregate<{
        _id: Types.ObjectId;
        unreadCount: number;
      }>([
        { $match: { recipient: new Types.ObjectId(userId), readAt: null } },
        { $group: { _id: '$sender', unreadCount: { $sum: 1 } } },
        { $sort: { unreadCount: -1 } },
      ])
      .exec();
    const total = counts.reduce((sum, item) => sum + item.unreadCount, 0);
    const senders = await this.userModel
      .find({ _id: { $in: counts.map((item) => item._id) } })
      .select('fullName username profilePicture role')
      .exec();
    const sendersById = new Map(
      senders.map((sender) => [sender._id.toString(), sender]),
    );
    return {
      total,
      chats: counts.map((item) => ({
        user: sendersById.get(item._id.toString()),
        unreadCount: item.unreadCount,
      })),
    };
  }

  async markChatRead(userId: string, chatId: string) {
    const chat = await this.findChatForMember(userId, chatId);
    const senderId = chat.participants.find(
      (participant) => participant.toString() !== userId,
    );
    if (!senderId) throw new NotFoundException('Chat not found');

    const filter = {
      sender: senderId,
      recipient: userId,
      readAt: null,
    };
    const messages = await this.messageModel.find(filter).select('_id').exec();
    if (messages.length === 0) {
      return {
        chatId,
        senderId: senderId.toString(),
        messageIds: [],
        readAt: null,
      };
    }

    const readAt = new Date();
    await this.messageModel
      .updateMany(filter, { $set: { readAt, deliveredAt: readAt } })
      .exec();
    return {
      chatId,
      senderId: senderId.toString(),
      messageIds: messages.map((message) => message._id.toString()),
      readAt,
    };
  }

  async markMessageDelivered(
    userId: string,
    chatId: string,
    messageId: string,
  ) {
    const chat = await this.findChatForMember(userId, chatId);
    this.assertObjectId(messageId);
    const otherParticipant = chat.participants.find(
      (participant) => participant.toString() !== userId,
    );
    if (!otherParticipant) throw new NotFoundException('Chat not found');
    const filter = {
      _id: messageId,
      sender: otherParticipant,
      recipient: userId,
    };
    const message = await this.messageModel
      .findOneAndUpdate(
        { ...filter, deliveredAt: null },
        { $set: { deliveredAt: new Date() } },
        { new: true },
      )
      .exec();
    const deliveredMessage =
      message ?? (await this.messageModel.findOne(filter).exec());
    if (!deliveredMessage) throw new NotFoundException('Message not found');
    return {
      messageId: deliveredMessage._id.toString(),
      chatId,
      senderId: deliveredMessage.sender.toString(),
      deliveredAt: deliveredMessage.deliveredAt,
    };
  }

  async sendMessageToUser(
    senderId: string,
    recipientId: string,
    content: string,
  ) {
    const chat = await this.createChat(senderId, recipientId);
    return this.sendChatMessage(senderId, chat._id.toString(), content);
  }

  async saveMessage(senderId: string, recipientId: string, content: string) {
    return this.sendMessageToUser(senderId, recipientId, content);
  }

  private async createMessage(
    senderId: string,
    recipientId: string,
    chatId: Types.ObjectId,
    content: string,
    attachments: MessageAttachment[] = [],
  ) {
    this.assertObjectId(senderId);
    this.assertObjectId(recipientId);
    if (senderId === recipientId) {
      throw new BadRequestException('You cannot message yourself');
    }

    const message = await this.messageModel.create({
      sender: senderId,
      recipient: recipientId,
      chatId,
      content,
      attachments,
    });
    return message.populate(
      'sender recipient',
      'fullName username profilePicture role',
    );
  }

  private async findChatForMember(userId: string, chatId: string) {
    this.assertObjectId(userId);
    this.assertObjectId(chatId);
    const chat = await this.chatModel
      .findOne({ _id: chatId, participants: userId })
      .exec();
    if (!chat) throw new NotFoundException('Chat not found');
    return chat;
  }

  private async assertFollowRelationship(userId: string, recipientId: string) {
    const hasFollowRelationship = await this.followModel.exists({
      $or: [
        { follower: userId, following: recipientId },
        { follower: recipientId, following: userId },
      ],
    });
    if (!hasFollowRelationship) {
      throw new ForbiddenException(
        'You or the other user must follow each other to start a chat',
      );
    }
  }

  private assertObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }
  }
}
