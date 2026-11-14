import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Chat extends Document {
  @Prop({
    required: true,
    type: [{ type: Types.ObjectId, ref: 'User' }],
  })
  participants!: Types.ObjectId[];

  @Prop({ required: true, unique: true, select: false })
  participantKey!: string;

  @Prop({ ref: 'Message', type: Types.ObjectId })
  lastMessage?: Types.ObjectId;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
