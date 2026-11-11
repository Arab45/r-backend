import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from 'src/schema/message.schema';
import { User, UserSchema } from 'src/schema/user.schema';
import { AuthModule } from 'src/auth/auth.module';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
