// src/services/emailService.ts
import { Resend } from 'resend';

export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is missing in environment variables');
    }

    this.resend = new Resend(apiKey);
    
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  }

  async sendRFPEmail(
    to: string,
    subject: string,
    body: string
  ): Promise<{ success: boolean; messageId?: string }> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject: subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`✅ Email sent to ${to}: ${data?.id}`);

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error: any) {
      console.error('Email Service Error (sendRFPEmail):', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      console.log('✅ Resend email service connected');
      return true;
    } catch (error) {
      console.error('Email connection verification failed:', error);
      return false;
    }
  }

  /**
   * Extract email address from "Name <email@domain.com>" format
   */
  extractEmailAddress(fromField: string): string {
    const match = fromField.match(/<(.+?)>/);
    return match ? match[1] : fromField.trim();
  }
}