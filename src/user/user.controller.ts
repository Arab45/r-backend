import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import {
  AcademicStepDto,
  ResearchStepDto,
  SignupDto,
} from './dto/create.user.dto';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './user.service';

@ApiTags('users', 'onboarding')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('signup')
  @ApiOperation({
    summary: 'Step 1: Signup',
    description:
      'Creates a new user account. Sets `onboardingStep` to 1. No authentication required.',
  })
  @ApiBody({
    type: SignupDto,
    examples: {
      example1: {
        summary: 'Typical signup',
        value: {
          fullName: 'Tommy Adebayo',
          email: 'tommy@example.com',
          password: 'password123',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User created; proceed to step 2 with returned userId',
    schema: {
      example: {
        success: true,
        message: 'User created successfully',
        data: {
          userId: '507f1f77bcf86cd799439011',
          onboardingStep: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or duplicate email',
  })
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

  @Put('onboarding/research/:userId')
  @ApiOperation({
    summary: 'Step 2: Research interests',
    description:
      'Requires `onboardingStep === 1`. Updates interests and advances to step 2.',
  })
  @ApiParam({
    name: 'userId',
    description: 'MongoDB ObjectId from step 1 (`data.userId`)',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    type: ResearchStepDto,
    examples: {
      example1: {
        summary: 'Research step',
        value: {
          areaOfInterest: ['AI', 'Blockchain'],
          briefResearchFocus: 'AI in decentralized finance',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Step completed; onboardingStep is now 2',
    schema: {
      example: {
        success: true,
        message: 'Research step completed',
        data: { onboardingStep: 2 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Wrong step (e.g. not step 1) or validation error',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
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
  @ApiOperation({
    summary: 'Step 3: Academic profile',
    description:
      'Requires `onboardingStep === 2`. Final step: sets `onboardingCompleted` to true.',
  })
  @ApiParam({
    name: 'userId',
    description: 'MongoDB ObjectId from signup',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    type: AcademicStepDto,
    examples: {
      example1: {
        summary: 'Academic step',
        value: {
          fieldOfStudy: 'Computer Science',
          institution: 'University of Ibadan',
          bio: 'AI enthusiast and backend developer',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding finished',
    schema: {
      example: {
        success: true,
        message: 'Onboarding completed',
        data: { onboardingCompleted: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Wrong step (e.g. not step 2) or validation error',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
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

  @Get(':userId')
  @ApiOperation({
    summary: 'Get user by ID',
    description:
      'Returns public profile fields without credentials or token data.',
  })
  @ApiParam({
    name: 'userId',
    description: 'MongoDB ObjectId',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'User found',
    schema: {
      example: {
        success: true,
        message: 'User retrieved successfully',
        user: {
          _id: '507f1f77bcf86cd799439011',
          onboardingStep: 2,
          onboardingCompleted: false,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('userId') userId: string) {
    const user = await this.usersService.getProfile(userId);

    return {
      success: true,
      message: 'User retrieved successfully',
      user,
    };
  }
}
