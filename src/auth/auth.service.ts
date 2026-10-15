import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from 'src/user/user.service';
import { AuthEmailService } from './email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly authEmailService: AuthEmailService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtService.sign(
      { sub: user._id },
      { expiresIn: '15m' },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user._id },
      { expiresIn: '7d' },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(user._id, refreshTokenHash);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    const payload = this.jwtService.verify(refreshToken);

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException();
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);

    if (!isValid) throw new UnauthorizedException();

    // Rotate refresh token
    const newRefreshToken = this.jwtService.sign(
      { sub: user._id },
      { expiresIn: '7d' },
    );

    const newHash = await bcrypt.hash(newRefreshToken, 10);
    await this.usersService.updateRefreshToken(user._id, newHash);

    const newAccessToken = this.jwtService.sign(
      { sub: user._id },
      { expiresIn: '15m' },
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string) {
    await this.usersService.clearRefreshToken(userId);
  }

  async forgotPassword(email: string) {
    const frontendUrl = process.env.FRONTEND_URL;
    if (!this.authEmailService.isConfigured() || !frontendUrl) {
      throw new ServiceUnavailableException(
        'Password reset email is not configured',
      );
    }

    const user = await this.usersService.findByEmail(email);
    if (!user)
      return { message: 'If the account exists, a reset link will be sent.' };

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);
    await this.usersService.setPasswordResetToken(
      user._id,
      tokenHash,
      new Date(Date.now() + 30 * 60 * 1000),
    );

    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await this.authEmailService.sendPasswordResetLink(user.email, resetUrl);
    } catch (error) {
      await this.usersService.clearPasswordResetToken(user._id);
      this.logger.error(
        `Password reset email delivery failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    return { message: 'If the account exists, a reset link will be sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashResetToken(token);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const reset = await this.usersService.resetPasswordWithToken(
      tokenHash,
      passwordHash,
    );
    if (!reset) {
      throw new BadRequestException('Invalid or expired password reset token');
    }
    return { message: 'Password has been reset successfully. Please log in.' };
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
