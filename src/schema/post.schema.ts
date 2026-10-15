import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Post extends Document {
  @Prop({ required: true, ref: 'User', type: Types.ObjectId, index: true })
  author!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 280 })
  content!: string;

  @Prop({ type: [String], default: [] })
  attachments!: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likes!: Types.ObjectId[];

  @Prop({ default: 0, min: 0 })
  commentCount!: number;
}

export const PostSchema = SchemaFactory.createForClass(Post);
PostSchema.set('toJSON', { virtuals: true });
PostSchema.set('toObject', { virtuals: true });
PostSchema.virtual('likeCount').get(function (this: Post) {
  return this.likes?.length ?? 0;
});
