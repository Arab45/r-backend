import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CloudinaryStorageService,
  CloudinaryUploadFile,
} from '../common/cloudinary-storage.service';
import * as bcrypt from 'bcrypt';
import { User } from '../schema/user.schema';
import {
  SignupDto,
  ResearchStepDto,
  AcademicStepDto,
} from './dto/create.user.dto';
import { UpdateProfileDto } from './dto/update.user.dto';
import { UserRole } from './user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly cloudinaryStorage: CloudinaryStorageService,
  ) {}

  //SIGNUP
  async signup(signupDto: SignupDto): Promise<User> {
    const { email, password, fullName, username, role } = signupDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    if (
      username &&
      (await this.userModel.exists({ username: username.toLowerCase() }))
    ) {
      throw new BadRequestException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userModel.create({
      email: email.toLocaleLowerCase(),
      fullName,
      role,
      username: username?.toLowerCase(),
      password: hashedPassword,
      onboardingStep: 1,
      onboardingCompleted: false,
    });

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async getProfile(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.userModel
      .findById(id)
      .select(
        'fullName username role institution fieldOfStudy bio profilePicture areaOfInterest briefResearchFocus onboardingCompleted createdAt',
      )
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    profilePicture?: CloudinaryUploadFile,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const updates: UpdateProfileDto = {};
    if (dto.fullName !== undefined) updates.fullName = dto.fullName;
    if (dto.username !== undefined) updates.username = dto.username;
    if (dto.institution !== undefined) updates.institution = dto.institution;
    if (dto.fieldOfStudy !== undefined) {
      updates.fieldOfStudy = dto.fieldOfStudy;
    }
    if (dto.bio !== undefined) updates.bio = dto.bio;
    if (dto.areaOfInterest !== undefined) {
      updates.areaOfInterest = dto.areaOfInterest;
    }
    if (dto.briefResearchFocus !== undefined) {
      updates.briefResearchFocus = dto.briefResearchFocus;
    }
    const updateFieldCount =
      Object.keys(updates).length + Number(!!profilePicture);
    if (updateFieldCount === 0) {
      throw new BadRequestException('Provide at least one profile field');
    }
    if (updateFieldCount > 1) {
      throw new BadRequestException(
        'Update only one profile field per request',
      );
    }

    if (updates.username !== undefined) {
      updates.username = updates.username.trim().toLowerCase();
      if (!updates.username) {
        throw new BadRequestException('Username cannot be empty');
      }
      const existingUser = await this.userModel.exists({
        username: updates.username,
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw new BadRequestException('Username already exists');
      }
    }

    const currentUser = await this.userModel
      .findById(userId)
      .select('+profilePicturePublicId')
      .exec();
    if (!currentUser) throw new NotFoundException('User not found');

    const uploadedPicture = profilePicture
      ? await this.cloudinaryStorage.uploadFile(
          profilePicture,
          'profile-pictures',
        )
      : undefined;
    const updateData: Record<string, unknown> = { ...updates };
    if (uploadedPicture) {
      updateData.profilePicture = uploadedPicture.url;
      updateData.profilePicturePublicId = uploadedPicture.publicId;
    }

    let user: User | null;
    try {
      user = await this.userModel
        .findByIdAndUpdate(
          userId,
          { $set: updateData },
          { new: true, runValidators: true },
        )
        .select(
          'fullName username role institution fieldOfStudy bio profilePicture areaOfInterest briefResearchFocus onboardingCompleted createdAt',
        )
        .exec();
    } catch (error) {
      if (uploadedPicture) {
        await this.cloudinaryStorage.deleteFiles([uploadedPicture]);
      }
      throw error;
    }
    if (!user) {
      if (uploadedPicture) {
        await this.cloudinaryStorage.deleteFiles([uploadedPicture]);
      }
      throw new NotFoundException('User not found');
    }
    if (uploadedPicture && currentUser.profilePicturePublicId) {
      await this.cloudinaryStorage.deleteFiles([
        { publicId: currentUser.profilePicturePublicId, resourceType: 'image' },
      ]);
    }
    return user;
  }

  async updateResearchStep(userId: string, dto: ResearchStepDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.RESEARCHER) {
      throw new BadRequestException(
        'The research onboarding step is only for researchers',
      );
    }

    if (user.onboardingStep !== 1) {
      throw new BadRequestException('Invalid onboarding step');
    }

    user.areaOfInterest = dto.areaOfInterest;
    user.briefResearchFocus = dto.briefResearchFocus;

    user.onboardingStep = 2;

    await user.save();

    return user;
  }

  async updateAcademicStep(userId: string, dto: AcademicStepDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const expectedStep = user.role === UserRole.STUDENT ? 1 : 2;
    if (user.onboardingStep !== expectedStep) {
      throw new BadRequestException('Complete previous step first');
    }

    user.fieldOfStudy = dto.fieldOfStudy;
    user.institution = dto.institution;
    user.bio = dto.bio;

    user.onboardingStep = expectedStep + 1;
    user.onboardingCompleted = true;

    await user.save();

    return user;
  }

  async updateRefreshToken(
    userId: string | Types.ObjectId,
    refreshTokenHash: string,
  ): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { refreshTokenHash });
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { refreshTokenHash: null });
  }

  async setPasswordResetToken(
    userId: string | Types.ObjectId,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId },
        {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: expiresAt,
        },
      )
      .exec();
  }

  async clearPasswordResetToken(
    userId: string | Types.ObjectId,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: userId },
        { $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 } },
      )
      .exec();
  }

  async resetPasswordWithToken(
    tokenHash: string,
    passwordHash: string,
  ): Promise<boolean> {
    const result = await this.userModel
      .updateOne(
        {
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: { $gt: new Date() },
        },
        {
          $set: { password: passwordHash, refreshTokenHash: null },
          $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 },
        },
      )
      .exec();
    return result.modifiedCount === 1;
  }

  async fetchProfile(userId: string) {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }
      const userData = await this.userModel.findById(userId);
      if (!userData) {
        throw new NotFoundException('user data not found');
      }

      return {
        id: userData._id,
        name: userData.fullName,
        role: userData.role,
        institution: userData.institution,
        bio: userData.bio,
        profilePicture: userData.profilePicture,
        areaOfInterest: userData.areaOfInterest,
      };
    } catch {
      throw new BadRequestException('something went wrong');
    }
  }

  async fetchAllUsers(userId: string, page = 1, limit = 10) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const filter = { _id: { $ne: new Types.ObjectId(userId) } };
    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select(
          'fullName username role institution fieldOfStudy bio profilePicture areaOfInterest briefResearchFocus onboardingCompleted createdAt',
        )
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      users,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}
