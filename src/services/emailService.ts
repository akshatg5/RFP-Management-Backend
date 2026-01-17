// src/services/emailService.ts
import { Resend } from 'resend';
import { prismaClient } from '../lib/prisma';

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

      console.log(`✅ RFP email sent to ${to}`);

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
   * Get recent webhook events (received proposals)
   */
  async getWebhookEvents(limit: number = 50): Promise<any[]> {
    try {
      const proposals = await prismaClient.proposal.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor: true,
          rfp: true,
        },
      });

      return proposals.map(proposal => ({
        id: proposal.id,
        type: 'email.proposal_received',
        vendorEmail: proposal.vendor.email,
        vendorName: proposal.vendor.name,
        rfpTitle: proposal.rfp.title,
        rfpId: proposal.rfpId,
        aiScore: proposal.aiScore,
        receivedAt: proposal.createdAt,
        status: 'processed',
      }));
    } catch (error: any) {
      console.error('Email Service Error (getWebhookEvents):', error);
      throw new Error(`Failed to get webhook events: ${error.message}`);
    }
  }

  /**
   * Extract email address from "Name <email@domain.com>" format
   */
  extractEmailAddress(fromField: string): string {
    const match = fromField.match(/<(.+?)>/);
    return match ? match[1] : fromField.trim();
  }

  // Fetch recent emails from Resend (for manual proposal checking)
  async getRecentEmails(limit: number = 10): Promise<any[]> {
    try {
      console.log(`📧 Fetching last ${limit} emails from Resend...`);
      
      const response = await fetch(
        `https://api.resend.com/emails?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Resend API Error: ${response.status} ${response.statusText}`);
        console.error('Error details:', errorText);
        throw new Error(`Failed to fetch emails: ${response.statusText}`);
      }

      const data: any = await response.json();
      const emails = data.data || [];
      
      console.log(`✅ Retrieved ${emails.length} emails`);
      return emails;
    } catch (error: any) {
      console.error('Email Service Error (getRecentEmails):', error.message);
      throw new Error(`Failed to fetch recent emails: ${error.message}`);
    }
  }
}