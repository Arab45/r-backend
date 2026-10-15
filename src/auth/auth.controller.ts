import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from './dto/create.auth.dto';
import { Client } from 'src/common/decorator/client.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request a password reset link',
    description: 'Sends a short-lived reset link when the account exists.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Reset request accepted' })
  @ApiResponse({
    status: 503,
    description: 'Password reset email is not configured',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Set a new password using a reset token',
    description:
      'Reset tokens expire after 30 minutes and can only be used once.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login',
    description:
      'Authenticate with email and password. Mobile clients receive JSON tokens. Web clients receive httpOnly cookies.',
  })
  @ApiBody({ type: LoginDto })
  @ApiHeader({
    name: 'X-Client',
    description: 'Client type: "mobile" for tokens, "web" for cookies',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description:
      'Login successful (mobile: tokens in body; web: cookies + message)',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Client() client: string,
    @Res() res: Response,
  ) {
    const tokens = await this.authService.login(dto.email, dto.password);

    if (client === 'mobile') {
      return res.json({
        ...tokens,
        expiresIn: 900,
      });
    }

    // WEB (cookies)
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({ message: 'Logged in' });
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh tokens',
    description:
      'Exchange a refresh token for new access and refresh tokens. Token can be sent via cookie (refreshToken) or Authorization header.',
  })
  @ApiResponse({
    status: 200,
    description: 'New tokens issued (cookies set for web)',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Req() req: Request, @Res() res: Response) {
    const token =
      req.cookies?.refreshToken || req.headers.authorization?.split(' ')[1];

    const tokens = await this.authService.refresh(token);

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json(tokens);
  }
}
