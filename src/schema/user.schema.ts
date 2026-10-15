import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  fullName!: string;

  @Prop()
  institution?: string;

  @Prop()
  fieldOfStudy?: string;

  @Prop()
  bio?: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ unique: true, sparse: true, lowercase: true, trim: true })
  username?: string;

  @Prop({ required: true })
  password!: string;

  @Prop()
  refreshTokenHash?: string;

  @Prop({ default: false })
  onboardingCompleted!: boolean;

  @Prop({ default: 1 })
  onboardingStep!: number;

  @Prop({ type: [String], default: [] })
  areaOfInterest!: string[];

  @Prop()
  briefResearchFocus?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
