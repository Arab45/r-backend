import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ required: true, ref: 'User', type: Types.ObjectId, index: true })
  sender!: Types.ObjectId;

  @Prop({ required: true, ref: 'User', type: Types.ObjectId, index: true })
  recipient!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 5000 })
  content!: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
