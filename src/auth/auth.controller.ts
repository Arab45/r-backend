import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';

import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from './dto/create.auth.dto';
import { Client } from '../common/decorator/client.decorator';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    
  ) {}

  @Post('/forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('/reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post('/login')
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

    return res.json({ message: 'Logged in', tokens});
  }

  @Post('refresh')
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

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const token =
      req.cookies?.refreshToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(400).json({ message: 'No refresh token provided' });
    }

    const payload = this.jwtService.verify(token);
    await this.authService.logout(payload.sub);

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res.json({ message: 'Logged out' });
  }
}
