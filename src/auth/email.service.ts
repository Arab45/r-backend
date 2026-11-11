import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthEmailService {
  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.configService.get<string>('RESEND_API_KEY') &&
        this.configService.get<string>('AUTH_EMAIL_FROM') &&
        this.configService.get<string>('FRONTEND_URL'),
    );
  }

  async sendPasswordResetLink(email: string, resetUrl: string) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const from = this.configService.get<string>('AUTH_EMAIL_FROM');
    if (!apiKey || !from) {
      throw new ServiceUnavailableException(
        'Password reset email is not configured',
      );
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: 'Reset your password',
        text: `Use this link to reset your password. It expires in 30 minutes: ${resetUrl}`,
        html: `<p>Use the link below to reset your password. It expires in 30 minutes.</p><p><a href="${resetUrl}">Reset password</a></p>`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend rejected the email (${response.status})`);
    }
  }
}
