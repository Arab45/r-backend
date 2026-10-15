import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from 'src/schema/user.schema';
import {
  SignupDto,
  ResearchStepDto,
  AcademicStepDto,
} from './dto/create.user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  // ✅ SIGNUP
  async signup(signupDto: SignupDto): Promise<User> {
    const { email, password, fullName, username } = signupDto;

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
      email,
      fullName,
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
        'fullName username institution fieldOfStudy bio areaOfInterest briefResearchFocus onboardingCompleted createdAt',
      )
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateResearchStep(userId: string, dto: ResearchStepDto) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
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

    if (user.onboardingStep !== 2) {
      throw new BadRequestException('Complete previous step first');
    }

    user.fieldOfStudy = dto.fieldOfStudy;
    user.institution = dto.institution;
    user.bio = dto.bio;

    user.onboardingStep = 3;
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
}
