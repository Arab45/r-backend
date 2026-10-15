import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Follow extends Document {
  @Prop({ required: true, ref: 'User', type: Types.ObjectId, index: true })
  follower!: Types.ObjectId;

  @Prop({ required: true, ref: 'User', type: Types.ObjectId, index: true })
  following!: Types.ObjectId;
}

export const FollowSchema = SchemaFactory.createForClass(Follow);
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });
