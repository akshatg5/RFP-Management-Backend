// src/controllers/inboundEmailController.ts - Re-parse endpoints
import { Request, Response } from 'express';
import { prismaClient } from '../lib/prisma';
import { RFPService } from '../services/rfpService';

const rfpService = new RFPService();

/**
 * GET /api/emails/inbound/unprocessed
 * Get all unprocessed or failed emails
 */
export const getUnprocessedEmails = async (req: Request, res: Response) => {
  try {
    const { rfpId } = req.query;

    const where: any = {
      OR: [
        { processed: false },
        { processingError: { not: null } },
      ],
    };

    if (rfpId) {
      where.rfpId = rfpId as string;
    }

    const emails = await prismaClient.inboundEmail.findMany({
      where,
      include: {
        rfp: {
          select: {
            id: true,
            title: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      data: emails,
    });
  } catch (error: any) {
    console.error('Error fetching unprocessed emails:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch unprocessed emails',
    });
  }
};

/**
 * POST /api/emails/inbound/:id/reparse
 * Re-parse a stored email with AI
 */
export const reparseInboundEmail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Fetch the stored email
    const email = await prismaClient.inboundEmail.findUnique({
      where: { id },
      include: {
        vendor: true,
        rfp: true,
      },
    });

    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found',
      });
    }

    if (!email.vendor || !email.rfp) {
      return res.status(400).json({
        success: false,
        error: 'Email is missing vendor or RFP association',
      });
    }

    console.log(`\n🔄 Re-parsing email ${id} for RFP ${email.rfpId}`);

    // Try to process with AI again
    try {
      const result = await rfpService.processVendorProposal(
        email.rfpId!,
        email.vendor.email,
        email.rawBody
      );

      // Update email as processed
      await prismaClient.inboundEmail.update({
        where: { id },
        data: {
          processed: true,
          processedAt: new Date(),
          proposalId: result.proposalId,
          processingError: null, // Clear any previous error
        },
      });

      console.log(`✅ Successfully re-parsed email and created proposal: ${result.proposalId}`);

      return res.status(200).json({
        success: true,
        message: 'Email re-parsed successfully',
        data: {
          proposalId: result.proposalId,
          aiScore: result.aiScore,
          extractedData: result.extractedData,
        },
      });
    } catch (aiError: any) {
      // Update with new error
      await prismaClient.inboundEmail.update({
        where: { id },
        data: {
          processingError: aiError.message,
        },
      });

      console.error(`❌ Re-parse failed: ${aiError.message}`);

      return res.status(500).json({
        success: false,
        error: `Failed to re-parse: ${aiError.message}`,
      });
    }
  } catch (error: any) {
    console.error('Error re-parsing email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to re-parse email',
    });
  }
};
