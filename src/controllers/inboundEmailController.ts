// src/controllers/inboundEmailController.ts
import { Request, Response } from 'express';
import { Resend } from 'resend';
import { RFPService } from '../services/rfpService';
import { VendorService } from '../services/vendorService';

const rfpService = new RFPService();
const vendorService = new VendorService();
const resend = new Resend(process.env.RESEND_API_KEY!);

/**
 * POST /api/webhooks/inbound-email
 * Webhook endpoint for Resend inbound emails
 */
export const handleInboundEmail = async (req: Request, res: Response) => {
  try {
    console.log('\n========== INBOUND EMAIL WEBHOOK RECEIVED ==========');
    
    const webhookPayload = req.body;
    
    // Check if this is an email.received event
    if (webhookPayload.type !== 'email.received') {
      console.log(`Ignoring webhook type: ${webhookPayload.type}`);
      return res.status(200).json({ success: true, message: 'Ignored non-received event' });
    }

    const emailData = webhookPayload.data;
    const emailId = emailData.email_id;

    console.log(`Email ID: ${emailId}`);
    console.log(`From: ${emailData.from}`);
    console.log(`Subject: ${emailData.subject}`);

    // Fetch full email content using Resend API
    console.log('Fetching full email content...');
    
    const { data: fullEmail, error: fetchError } = await resend.emails.get(emailId);

    if (fetchError || !fullEmail) {
      console.error('Error fetching email:', fetchError);
      return res.status(200).json({ 
        success: false, 
        error: 'Failed to fetch email content' 
      });
    }

    console.log('Full email content retrieved');

    // Extract email details
    const from = emailData.from;
    const subject = emailData.subject;
    const textBody = (fullEmail as any).text || (fullEmail as any).html || '';

    console.log(`Body Preview: ${textBody.substring(0, 150)}...`);

    if (!from || !textBody) {
      console.log('⚠️  Missing required email fields');
      return res.status(200).json({
        success: false,
        error: 'Missing required email fields',
      });
    }

    // Extract vendor email
    const vendorEmail = extractEmailAddress(from);
    console.log(`Vendor Email: ${vendorEmail}`);

    // Find vendor
    const vendor = await vendorService.getVendorByEmail(vendorEmail);
    
    if (!vendor) {
      console.log(`⚠️  No vendor found with email: ${vendorEmail}`);
      return res.status(200).json({
        success: true,
        message: 'Email received but no matching vendor found',
      });
    }

    console.log(`✅ Found vendor: ${vendor.name}`);

    // Extract RFP ID from subject or body
    const rfpId = extractRFPId(subject, textBody);

    if (!rfpId) {
      console.log(`⚠️  Could not extract RFP ID from email`);
      console.log(`   Subject: ${subject}`);
      return res.status(200).json({
        success: true,
        message: 'Email received but no RFP ID found',
      });
    }

    console.log(`✅ Extracted RFP ID: ${rfpId}`);

    // Check if RFP exists
    const rfp = await rfpService.getRFPById(rfpId);

    if (!rfp) {
      console.log(`⚠️  RFP ${rfpId} not found`);
      return res.status(200).json({
        success: true,
        message: 'Email received but RFP not found',
      });
    }

    console.log(`✅ Found RFP: ${rfp.title}`);

    // Process the vendor proposal using AI
    console.log(`🤖 Processing proposal with AI...`);
    
    const result = await rfpService.processVendorProposal(
      rfpId,
      vendorEmail,
      textBody
    );

    console.log(`✅ Successfully created proposal: ${result.proposalId}`);
    console.log('=============================================\n');

    // Return success to Resend
    return res.status(200).json({
      success: true,
      message: 'Proposal processed successfully',
      data: {
        proposalId: result.proposalId,
        vendorName: vendor.name,
        rfpTitle: rfp.title,
      },
    });

  } catch (error: any) {
    console.error('❌ Inbound Email Error:', error.message);
    console.log('=============================================\n');
    
    // Still return 200 to Resend (don't retry)
    return res.status(200).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Extract email address from "Name <email@domain.com>" format
 */
function extractEmailAddress(fromField: string): string {
  const match = fromField.match(/<(.+?)>/);
  return match ? match[1].toLowerCase().trim() : fromField.toLowerCase().trim();
}

/**
 * Extract RFP ID from email subject or body
 */
function extractRFPId(subject: string, body: string): string | null {
  const text = `${subject} ${body}`;

  // Pattern 1: RFP ID: {uuid}
  const pattern1 = /RFP\s*ID\s*[:\s-]+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
  const match1 = text.match(pattern1);
  if (match1) return match1[1];

  // Pattern 2: RFP-{uuid} or RFP {uuid}
  const pattern2 = /RFP[:\s-]+([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
  const match2 = text.match(pattern2);
  if (match2) return match2[1];

  // Pattern 3: Just find any UUID
  const pattern3 = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
  const match3 = text.match(pattern3);
  if (match3) return match3[1];

  return null;
}