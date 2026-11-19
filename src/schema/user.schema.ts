import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from '../user/user-role.enum';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true })
  fullName!: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.STUDENT })
  role!: UserRole;

  @Prop()
  institution?: string;

  @Prop()
  fieldOfStudy?: string;

  @Prop()
  bio?: string;

  @Prop()
  profilePicture?: string;

  @Prop({ select: false })
  profilePicturePublicId?: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ unique: true, sparse: true, lowercase: true, trim: true })
  username?: string;

  @Prop({ required: true })
  password!: string;

  @Prop()
  refreshTokenHash?: string;

  @Prop({ select: false, index: true })
  passwordResetTokenHash?: string;

  @Prop({ select: false })
  passwordResetExpiresAt?: Date;

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
