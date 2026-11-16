import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AcademicStepDto,
  ResearchStepDto,
  SignupDto,
} from './dto/create.user.dto';
import { UpdateProfileDto } from './dto/update.user.dto';
import { UsersService } from './user.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    const user = await this.usersService.signup(dto);

    return {
      success: true,
      message: 'User created successfully',
      data: {
        userId: user._id,
        onboardingStep: user.onboardingStep,
      },
    };
  }

  @Get('/fetch-all')
  @UseGuards(JwtAuthGuard)
  async getAllUsers(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.fetchAllUsers(
      req.user.userId,
      Number(page),
      Number(limit),
    );
  }

  @Patch('/update-profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(req.user.userId, dto);
    return {
      success: true,
      message: 'Profile updated successfully',
      user,
    };
  }

  @Put('onboarding/research/:userId')
  async updateResearch(
    @Param('userId') userId: string,
    @Body() dto: ResearchStepDto,
  ) {
    const user = await this.usersService.updateResearchStep(userId, dto);

    return {
      success: true,
      message: 'Research step completed',
      data: {
        onboardingStep: user.onboardingStep,
      },
    };
  }

  @Put('onboarding/academic/:userId')
  async updateAcademic(
    @Param('userId') userId: string,
    @Body() dto: AcademicStepDto,
  ) {
    const user = await this.usersService.updateAcademicStep(userId, dto);

    return {
      success: true,
      message: 'Onboarding completed',
      data: {
        onboardingCompleted: user.onboardingCompleted,
      },
    };
  }

  @Get('/:userId')
  async getUserById(@Param('userId') userId: string) {
    const user = await this.usersService.getProfile(userId);

    return {
      success: true,
      message: 'User retrieved successfully',
      user,
    };
  }

  @Get('/profile/:userId')
  async fetchProfile(@Param('userId') userId: string) {
    const profile = await this.usersService.fetchProfile(userId);

    return {
      success: true,
      message: 'Profile retrieved successfully',
      profile,
    };
  }
}
