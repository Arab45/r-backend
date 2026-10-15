import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class AuthEmailService {
  isConfigured() {
    return Boolean(
      process.env.RESEND_API_KEY &&
      process.env.AUTH_EMAIL_FROM &&
      process.env.FRONTEND_URL,
    );
  }

  async sendPasswordResetLink(email: string, resetUrl: string) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.AUTH_EMAIL_FROM;
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
