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
    
    console.log('Webhook Payload:', JSON.stringify(webhookPayload, null, 2));
    
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
    console.log(`Email Data Keys:`, Object.keys(emailData));

    // STEP 1: Try to get email content from webhook payload first
    console.log('Checking webhook payload for email content...');
    
    let emailBody = '';
    let fullEmail: any = emailData;
    
    // Check if webhook includes text or html directly
    if (emailData.text || emailData.html) {
      console.log('✅ Email content found in webhook payload');
      emailBody = emailData.text || emailData.html || '';
    } else {
      // STEP 2: Use Resend SDK to fetch received email content
      console.log('Email content not in webhook, fetching using Resend SDK receiving API...');
      
      try {
        // Use Resend SDK's receiving.get() method for inbound emails
        const receivedEmail = await resend.emails.receiving.get(emailId);
        
        if (receivedEmail.data) {
          fullEmail = receivedEmail.data;
          emailBody = fullEmail.text || fullEmail.html || '';
          console.log('✅ Email content retrieved from Resend receiving API');
        } else {
          console.warn('⚠️ Resend receiving API returned no data');
        }
      } catch (fetchError: any) {
        console.error('❌ Error fetching from Resend receiving API:', fetchError.message);
        console.log('   This might indicate the email is not available yet or API permissions issue');
      }
    }

    // STEP 3: If still no body, we need to inform the user
    if (!emailBody || emailBody.trim().length === 0) {
      console.error('❌ No email body available from webhook or Resend API');
      console.log('📋 Available email data:', JSON.stringify(emailData, null, 2));
      
      return res.status(200).json({
        success: false,
        error: 'Email body not available. The email may not have been fully processed yet.',
        hint: 'Resend stores received emails and makes them available via the receiving API. Please try again in a few moments.',
        receivedData: {
          from: emailData.from,
          subject: emailData.subject,
          email_id: emailId,
          hasText: !!emailData.text,
          hasHtml: !!emailData.html,
        },
      });
    }

    // STEP 4: Extract email content (prioritize text, fallback to HTML)
    const from = emailData.from;
    const subject = emailData.subject || fullEmail.subject || '';
    
    // If we have HTML but no text, convert HTML to text
    if (!emailBody.includes('<') && fullEmail.html) {
      // emailBody might be HTML, convert it
      emailBody = emailBody
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
    }

    console.log(`Body Preview: ${emailBody.substring(0, 200)}...`);
    console.log(`Body Length: ${emailBody.length} characters`);

    // Handle attachments if present
    const attachments = fullEmail.attachments || [];
    console.log(`Attachments: ${attachments.length}`);
    
    if (attachments.length > 0) {
      console.log('Attachment details:');
      attachments.forEach((att: any, idx: number) => {
        console.log(`  [${idx + 1}] ${att.filename} (${att.content_type})`);
      });
    }

    // STEP 3: Validate email data
    if (!from || !emailBody) {
      console.log('⚠️  Missing required email fields');
      return res.status(200).json({
        success: false,
        error: 'Missing required email fields (from or body)',
      });
    }

    // STEP 4: Extract vendor email
    const vendorEmail = extractEmailAddress(from);
    console.log(`Vendor Email: ${vendorEmail}`);

    // STEP 5: Find vendor in database
    const vendor = await vendorService.getVendorByEmail(vendorEmail);
    
    if (!vendor) {
      console.log(`⚠️  No vendor found with email: ${vendorEmail}`);
      return res.status(200).json({
        success: true,
        message: 'Email received but no matching vendor found',
        hint: 'Please ensure the vendor is registered in the system',
      });
    }

    console.log(`✅ Found vendor: ${vendor.name} (ID: ${vendor.id})`);

    // STEP 6: Extract RFP ID from subject or body
    const rfpId = extractRFPId(subject, emailBody);

    if (!rfpId) {
      console.log(`⚠️  Could not extract RFP ID from email`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Body preview: ${emailBody.substring(0, 200)}`);
      
      return res.status(200).json({
        success: true,
        message: 'Email received but no RFP ID found',
        hint: 'Please ensure the RFP ID is included in the email subject or body',
      });
    }

    console.log(`✅ Extracted RFP ID: ${rfpId}`);

    // STEP 7: Verify RFP exists
    const rfp = await rfpService.getRFPById(rfpId);

    if (!rfp) {
      console.log(`⚠️  RFP ${rfpId} not found in database`);
      return res.status(200).json({
        success: true,
        message: 'Email received but RFP not found',
      });
    }

    console.log(`✅ Found RFP: ${rfp.title}`);

    // STEP 8: Process attachments (if any) - extract text from PDFs, parse spreadsheets
    let attachmentData = '';
    
    if (attachments.length > 0) {
      console.log('🔍 Processing attachments...');
      attachmentData = await processAttachments(attachments);
      
      if (attachmentData) {
        console.log(`✅ Extracted ${attachmentData.length} chars from attachments`);
        // Append attachment data to email body for AI processing
        emailBody += '\n\n--- ATTACHMENT CONTENT ---\n' + attachmentData;
      }
    }

    // STEP 9: Process the vendor proposal using AI
    console.log(`🤖 Processing proposal with AI...`);
    console.log(`   Total content length: ${emailBody.length} characters`);
    
    const result = await rfpService.processVendorProposal(
      rfpId,
      vendorEmail,
      emailBody
    );

    console.log(`✅ Successfully created proposal: ${result.proposalId}`);
    console.log(`   AI Score: ${result.aiScore || 'N/A'}`);
    console.log(`   Total Price: ${result.extractedData?.totalPrice || 'N/A'}`);
    console.log('=============================================\n');

    // Return success to Resend
    return res.status(200).json({
      success: true,
      message: 'Proposal processed successfully',
      data: {
        proposalId: result.proposalId,
        vendorName: vendor.name,
        rfpTitle: rfp.title,
        aiScore: result.aiScore,
        extractedData: result.extractedData,
      },
    });

  } catch (error: any) {
    console.error('❌ Inbound Email Error:', error.message);
    console.error('Stack:', error.stack);
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
 * Supports multiple formats:
 * - "RFP ID: abc-123"
 * - "RFP-abc-123"
 * - "Re: RFP abc-123"
 * - Any UUID format
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

  // Pattern 3: Just find any UUID (most permissive)
  const pattern3 = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
  const match3 = text.match(pattern3);
  if (match3) return match3[1];

  return null;
}

/**
 * Process email attachments and extract text content
 * Supports: PDF, XLSX, CSV, TXT, DOCX
 */
async function processAttachments(attachments: any[]): Promise<string> {
  let extractedText = '';
  
  for (const attachment of attachments) {
    const { filename, content_type, content } = attachment;
    
    try {
      console.log(`Processing attachment: ${filename} (${content_type})`);
      
      // Handle different file types
      if (content_type === 'text/plain' || content_type === 'text/csv') {
        // Plain text or CSV - decode base64
        const decoded = Buffer.from(content, 'base64').toString('utf-8');
        extractedText += `\n\n--- ${filename} ---\n${decoded}\n`;
      } 
      else if (content_type === 'application/pdf') {
        // PDF - would need pdf-parse library
        console.log('⚠️  PDF parsing not yet implemented');
        extractedText += `\n\n--- ${filename} (PDF - content not extracted) ---\n`;
      }
      else if (content_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        // XLSX - would need xlsx library
        console.log('⚠️  XLSX parsing not yet implemented');
        extractedText += `\n\n--- ${filename} (Excel - content not extracted) ---\n`;
      }
      else {
        console.log(`⚠️  Unsupported file type: ${content_type}`);
      }
      
    } catch (error: any) {
      console.error(`Error processing ${filename}:`, error.message);
    }
  }
  
  return extractedText;
}