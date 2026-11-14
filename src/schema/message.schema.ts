import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface MessageAttachment {
  url: string;
  publicId: string;
  originalName: string;
  mimeType: string;
  size: number;
  resourceType: string;
}

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ required: true, ref: 'User', type: Types.ObjectId, index: true })
  sender!: Types.ObjectId;

  @Prop({ required: true, ref: 'User', type: Types.ObjectId, index: true })
  recipient!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 5000, default: '' })
  content!: string;

  @Prop({
    type: [
      {
        _id: false,
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        resourceType: { type: String, required: true },
      },
    ],
    default: [],
  })
  attachments!: MessageAttachment[];
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
