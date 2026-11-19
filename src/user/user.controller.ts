import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CloudinaryUploadFile } from '../common/cloudinary-storage.service';
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
        role: user.role,
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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        username: { type: 'string' },
        institution: { type: 'string' },
        fieldOfStudy: { type: 'string' },
        bio: { type: 'string' },
        areaOfInterest: { type: 'array', items: { type: 'string' } },
        briefResearchFocus: { type: 'string' },
        profilePicture: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('profilePicture', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        if (
          !['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(
            file.mimetype,
          )
        ) {
          callback(
            new BadRequestException('Profile picture must be an image'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() profilePicture?: CloudinaryUploadFile,
  ) {
    const user = await this.usersService.updateProfile(
      req.user.userId,
      dto,
      profilePicture,
    );
    return {
      success: true,
      message: 'Profile updated successfully',
      user,
    };
  }

  @Patch('onboarding/research/:userId')
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

  @Patch('onboarding/academic/:userId')
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
