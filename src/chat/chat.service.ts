import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from 'src/schema/message.schema';
import { User } from 'src/schema/user.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async saveMessage(senderId: string, recipientId: string, content: string) {
    this.assertObjectId(senderId);
    this.assertObjectId(recipientId);
    const messageContent = content?.trim();
    if (!messageContent || messageContent.length > 5000) {
      throw new BadRequestException(
        'Message must contain 1 to 5000 characters',
      );
    }
    if (senderId === recipientId) {
      throw new BadRequestException('You cannot message yourself');
    }

    const recipient = await this.userModel.exists({ _id: recipientId });
    if (!recipient) throw new NotFoundException('User not found');

    const message = await this.messageModel.create({
      sender: senderId,
      recipient: recipientId,
      content: messageContent,
    });
    return message.populate('sender recipient', 'fullName username');
  }

  private assertObjectId(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }
  }
}
