import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Comment extends Document {
  @Prop({ required: true, ref: 'Post', type: Types.ObjectId, index: true })
  post!: Types.ObjectId;

  @Prop({ required: true, ref: 'User', type: Types.ObjectId })
  author!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  content!: string;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
