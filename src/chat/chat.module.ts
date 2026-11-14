import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from '../schema/chat.schema';
import { Follow, FollowSchema } from '../schema/follow.schema';
import { Message, MessageSchema } from '../schema/message.schema';
import { User, UserSchema } from '../schema/user.schema';
import { AuthModule } from '../auth/auth.module';
import { ChatController } from './chat.controller';
import { ChatAttachmentService } from './chat-attachment.service';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Chat.name, schema: ChatSchema },
      { name: Follow.name, schema: FollowSchema },
      { name: Message.name, schema: MessageSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ChatController],
  providers: [ChatAttachmentService, ChatGateway, ChatService],
  exports: [ChatService],
})
export class ChatModule {}
