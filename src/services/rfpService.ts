import { prismaClient } from "../lib/prisma";
import {
  CreateRFPInput,
  CreateRFPResponse,
  RFPComparison,
  RFPWithVendors,
  SendRFPToVendorsInput,
  StructuredRFP,
} from "../types/rfpTypes";
import { AIService } from "./aiService";
import { EmailService } from "./emailService";

export class RFPService {
  private aiService: AIService;
  private emailService: EmailService;

  constructor() {
    this.aiService = new AIService();
    this.emailService = new EmailService();
  }

  // create a new RFP from natural language prompt
  async createRFP(input: CreateRFPInput): Promise<CreateRFPResponse> {
    try {
      // ai service call to process prompt
      const structuredData =
        await this.aiService.structuredRFPFromNaturalLanguage(
          input.naturalLanguagePrompt
        );

      // save the rfp in the db
      const rfp = await prismaClient.requestForProposal.create({
        data: {
          title: structuredData.title,
          rawPrompt: input.naturalLanguagePrompt,
          structuredData: structuredData as any,
          budget: structuredData.budget,
          deliveryDays: structuredData.deliveryDays,
          paymentTerms: structuredData.paymentTerms,
          warrantyYears: structuredData.warrantyYears,
        },
      });

      return {
        id: rfp.id,
        title: rfp.title,
        rawPrompt: rfp.rawPrompt,
        structuredData: rfp.structuredData as unknown as StructuredRFP,
        budget: rfp.budget ?? undefined,
        deliveryDays: rfp.deliveryDays ?? undefined,
        paymentTerms: rfp.paymentTerms ?? undefined,
        warrantyYears: rfp.warrantyYears ?? undefined,
        createdAt: rfp.createdAt,
      };
    } catch (error: any) {
      console.error("RFP Service Error (createRFP):", error);
      throw new Error(`Failed to create RFP: ${error.message}`);
    }
  }

  // Get RFP by ID
  async getRFPById(rfpId: string): Promise<CreateRFPResponse | null> {
    try {
      const rfp = await prismaClient.requestForProposal.findUnique({
        where: { id: rfpId },
      });

      if (!rfp) {
        throw new Error("Invalid RFP id - No valid RFP Exists");
      }

      return {
        id: rfp.id,
        title: rfp.title,
        rawPrompt: rfp.rawPrompt,
        structuredData: rfp.structuredData as unknown as StructuredRFP,
        budget: rfp.budget ?? undefined,
        deliveryDays: rfp.deliveryDays ?? undefined,
        paymentTerms: rfp.paymentTerms ?? undefined,
        warrantyYears: rfp.warrantyYears ?? undefined,
        createdAt: rfp.createdAt,
      };
    } catch (error: any) {
      console.error("RFP Service Error (getRFPById):", error);
      throw new Error(`Failed to fetch RFP: ${error.message}`);
    }
  }

  // Get all RFPs
  async getAllRFPs(): Promise<CreateRFPResponse[]> {
    try {
      const rfps = await prismaClient.requestForProposal.findMany({
        orderBy: { createdAt: "desc" },
      });

      return rfps.map((rfp: any) => ({
        id: rfp.id,
        title: rfp.title,
        rawPrompt: rfp.rawPrompt,
        structuredData: rfp.structuredData as unknown as StructuredRFP,
        budget: rfp.budget ?? undefined,
        deliveryDays: rfp.deliveryDays ?? undefined,
        paymentTerms: rfp.paymentTerms ?? undefined,
        warrantyYears: rfp.warrantyYears ?? undefined,
        createdAt: rfp.createdAt,
      }));
    } catch (error: any) {
      console.error("RFP Service Error (getAllRFPs):", error);
      throw new Error(`Failed to fetch RFPs: ${error.message}`);
    }
  }

  // Get RFP with associated vendors
  async getRFPWithVendors(rfpId: string): Promise<RFPWithVendors | null> {
    try {
      const rfp = await prismaClient.requestForProposal.findUnique({
        where: { id: rfpId },
        include: {
          vendors: {
            include: {
              vendor: true,
            },
          },
        },
      });

      if (!rfp) {
        return null;
      }

      return {
        id: rfp.id,
        title: rfp.title,
        structuredData: rfp.structuredData as unknown as StructuredRFP,
        vendors: rfp.vendors.map((rv: any) => ({
          id: rv.vendor.id,
          name: rv.vendor.name,
          email: rv.vendor.email,
          status: rv.status,
          sentAt: rv.sentAt ?? undefined,
        })),
      };
    } catch (error: any) {
      console.error("RFP Service Error (getRFPWithVendors):", error);
      throw new Error(`Failed to fetch RFP with vendors: ${error.message}`);
    }
  }

  // Send RFP to selected vendors
  async sendRFPToVendors(input: SendRFPToVendorsInput): Promise<{
    success: boolean;
    sentCount: number;
    failedVendors: string[];
  }> {
    try {
      // Fetch RFP
      const rfp = await prismaClient.requestForProposal.findUnique({
        where: { id: input.rfpId },
      });

      if (!rfp) {
        throw new Error("RFP not found");
      }

      // Fetch vendors
      const vendors = await prismaClient.vendor.findMany({
        where: {
          id: { in: input.vendorIds },
        },
      });

      if (vendors.length === 0) {
        throw new Error("No valid vendors found");
      }

      const structuredData = rfp.structuredData as unknown as StructuredRFP;
      let sentCount = 0;
      const failedVendors: string[] = [];

      // Send email to each vendor and create RFPVendor record
      for (const vendor of vendors) {
        try {
          // Generate email content using AI
          const emailContent = await this.aiService.generateRFPEmailContent(
            structuredData,
            vendor.name
          );

          // Send email
          await this.emailService.sendRFPEmail(
            vendor.email,
            emailContent.subject,
            emailContent.body
          );

          // Create or update RFPVendor record
          await prismaClient.rFPVendor.upsert({
            where: {
              id: `${input.rfpId}-${vendor.id}`,
            },
            create: {
              rfpId: input.rfpId,
              vendorId: vendor.id,
              status: "SENT",
              sentAt: new Date(),
            },
            update: {
              status: "SENT",
              sentAt: new Date(),
            },
          });

          sentCount++;
        } catch (error: any) {
          console.error(`Failed to send RFP to ${vendor.name}:`, error);
          failedVendors.push(vendor.name);
        }
      }

      return {
        success: sentCount > 0,
        sentCount,
        failedVendors,
      };
    } catch (error: any) {
      console.error("RFP Service Error (sendRFPToVendors):", error);
      throw new Error(`Failed to send RFP to vendors: ${error.message}`);
    }
  }

  // Process incoming vendor proposal email
  async processVendorProposal(
    rfpId: string,
    vendorEmail: string,
    emailBody: string
  ): Promise<{
    success: boolean;
    proposalId: string;
  }> {
    try {
      // Fetch RFP
      const rfp = await prismaClient.requestForProposal.findUnique({
        where: { id: rfpId },
      });

      if (!rfp) {
        throw new Error("RFP not found");
      }

      // Find vendor by email
      const vendor = await prismaClient.vendor.findUnique({
        where: { email: vendorEmail },
      });

      if (!vendor) {
        throw new Error(`Vendor with email ${vendorEmail} not found`);
      }

      const structuredData = rfp.structuredData as unknown as StructuredRFP;

      // Parse vendor proposal using AI
      const parsedProposal = await this.aiService.parseVendorProposal(
        emailBody,
        structuredData
      );

      // Score the proposal using AI
      const scoring = await this.aiService.scoreProposal(
        structuredData,
        parsedProposal.extractedData,
        vendor.name
      );

      // Create proposal record
      const proposal = await prismaClient.proposal.create({
        data: {
          rfpId: rfpId,
          vendorId: vendor.id,
          rawEmailBody: emailBody,
          extractedData: parsedProposal.extractedData as any,
          aiScore: scoring.score,
          aiEvaluation: scoring.evaluation,
        },
      });

      // Update RFPVendor status
      await prismaClient.rFPVendor.updateMany({
        where: {
          rfpId: rfpId,
          vendorId: vendor.id,
        },
        data: {
          status: "RESPONDED",
        },
      });

      return {
        success: true,
        proposalId: proposal.id,
      };
    } catch (error: any) {
      console.error("RFP Service Error (processVendorProposal):", error);
      throw new Error(`Failed to process vendor proposal: ${error.message}`);
    }
  }

  // Get comparison of all proposals for an RFP with AI recommendation
  async compareProposals(rfpId: string): Promise<RFPComparison> {
    try {
      // Fetch RFP with proposals
      const rfp = await prismaClient.requestForProposal.findUnique({
        where: { id: rfpId },
        include: {
          proposals: {
            include: {
              vendor: true,
            },
          },
        },
      });

      if (!rfp) {
        throw new Error("RFP not found");
      }

      if (rfp.proposals.length === 0) {
        return {
          rfpId: rfp.id,
          rfpTitle: rfp.title,
          proposals: [],
        };
      }

      const structuredData = rfp.structuredData as unknown as StructuredRFP;

      // Format proposals for comparison
      const formattedProposals = rfp.proposals.map((p: any) => {
        const extracted = p.extractedData as any;
        return {
          id: p.id,
          vendorName: p.vendor.name,
          vendorEmail: p.vendor.email,
          totalPrice: extracted.totalPrice,
          aiScore: p.aiScore ?? undefined,
          aiEvaluation: p.aiEvaluation ?? undefined,
          extractedData: extracted,
          createdAt: p.createdAt,
        };
      });

      // Get AI recommendation if multiple proposals
      let aiRecommendations;
      if (rfp.proposals.length > 1) {
        const proposalsForAI = rfp.proposals.map((p: any) => ({
          vendorName: p.vendor.name,
          vendorId: p.vendor.id,
          extractedData: p.extractedData,
          aiScore: p.aiScore,
          aiEvaluation: p.aiEvaluation,
        }));

        aiRecommendations = await this.aiService.compareProposalsAndRecommend(
          structuredData,
          proposalsForAI
        );
      }

      return {
        rfpId: rfp.id,
        rfpTitle: rfp.title,
        proposals: formattedProposals,
        aiRecommendations,
      };
    } catch (error: any) {
      console.error("RFP Service Error (compareProposals):", error);
      throw new Error(`Failed to compare proposals: ${error.message}`);
    }
  }

  // Delete an RFP
  async deleteRFP(rfpId: string): Promise<{ success: boolean }> {
    try {
      // Delete proposals first (cascading)
      await prismaClient.proposal.deleteMany({
        where: { rfpId },
      });

      // Delete RFPVendor records
      await prismaClient.rFPVendor.deleteMany({
        where: { rfpId },
      });

      // Delete RFP
      await prismaClient.requestForProposal.delete({
        where: { id: rfpId },
      });

      return { success: true };
    } catch (error: any) {
      console.error("RFP Service Error (deleteRFP):", error);
      throw new Error(`Failed to delete RFP: ${error.message}`);
    }
  }
}
