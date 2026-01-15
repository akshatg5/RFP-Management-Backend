import { prismaClient } from "../lib/prisma";
import { ProposalResponse } from "../types/proposalTypes";

export class ProposalService {
  // Get proposal by ID
  async getProposalById(proposalId: string): Promise<ProposalResponse | null> {
    try {
      const proposal = await prismaClient.proposal.findUnique({
        where: { id: proposalId },
        include: {
          vendor: true,
        },
      });

      if (!proposal) {
        return null;
      }

      return {
        id: proposal.id,
        rfpId: proposal.rfpId,
        vendorId: proposal.vendorId,
        vendorName: proposal.vendor.name,
        vendorEmail: proposal.vendor.email,
        rawEmailBody: proposal.rawEmailBody,
        extractedData: proposal.extractedData,
        aiScore: proposal.aiScore ?? undefined,
        aiEvaluation: proposal.aiEvaluation ?? undefined,
        createdAt: proposal.createdAt,
      };
    } catch (error: any) {
      console.error("Proposal Service Error (getProposalById):", error);
      throw new Error(`Failed to fetch proposal: ${error.message}`);
    }
  }

  // get all proposals for an RFP
  async getProposalsByRFP(rfpId: string): Promise<ProposalResponse[]> {
    try {
      const proposals = await prismaClient.proposal.findMany({
        where: { rfpId },
        include: {
          vendor: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return proposals.map((proposal: any) => ({
        id: proposal.id,
        rfpId: proposal.rfpId,
        vendorId: proposal.vendorId,
        vendorName: proposal.vendor.name,
        vendorEmail: proposal.vendor.email,
        rawEmailBody: proposal.rawEmailBody,
        extractedData: proposal.extractedData,
        aiScore: proposal.aiScore ?? undefined,
        aiEvaluation: proposal.aiEvaluation ?? undefined,
        createdAt: proposal.createdAt,
      }));
    } catch (error: any) {
      console.error("Proposal Service Error (getProposalsByRFP):", error);
      throw new Error(`Failed to fetch proposals: ${error.message}`);
    }
  }

  // get all proposals from a specific vendor
  async getProposalsByVendor(vendorId: string): Promise<ProposalResponse[]> {
    try {
      const proposals = await prismaClient.proposal.findMany({
        where: { vendorId },
        include: {
          vendor: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return proposals.map((proposal: any) => ({
        id: proposal.id,
        rfpId: proposal.rfpId,
        vendorId: proposal.vendorId,
        vendorName: proposal.vendor.name,
        vendorEmail: proposal.vendor.email,
        rawEmailBody: proposal.rawEmailBody,
        extractedData: proposal.extractedData,
        aiScore: proposal.aiScore ?? undefined,
        aiEvaluation: proposal.aiEvaluation ?? undefined,
        createdAt: proposal.createdAt,
      }));
    } catch (error: any) {
      console.error("Proposal Service Error (getProposalsByVendor):", error);
      throw new Error(`Failed to fetch proposals: ${error.message}`);
    }
  }

  // delete a proposal
  async deleteProposal(proposalId: string): Promise<{ success: boolean }> {
    try {
      await prismaClient.proposal.delete({
        where: { id: proposalId },
      });

      return { success: true };
    } catch (error: any) {
      console.error("Proposal Service Error (deleteProposal):", error);
      throw new Error(`Failed to delete proposal: ${error.message}`);
    }
  }

  // get statistics for proposals
  async getProposalStats(rfpId: string): Promise<{
    totalProposals: number;
    averageScore?: number;
    highestScore?: number;
    lowestScore?: number;
    topVendor?: {
      name: string;
      score: number;
    };
  }> {
    try {
      const proposals = await prismaClient.proposal.findMany({
        where: { rfpId },
        include: {
          vendor: true,
        },
      });

      if (proposals.length === 0) {
        return { totalProposals: 0 };
      }

      const scores = proposals
        .filter((p: any) => p.aiScore !== null)
        .map((p: any) => p.aiScore as number);

      if (scores.length === 0) {
        return { totalProposals: proposals.length };
      }

      const averageScore =
        scores.reduce((a: any, b: any) => a + b, 0) / scores.length;
      const highestScore = Math.max(...scores);
      const lowestScore = Math.min(...scores);

      const topProposal = proposals.find(
        (p: any) => p.aiScore === highestScore
      );

      return {
        totalProposals: proposals.length,
        averageScore: Math.round(averageScore * 100) / 100,
        highestScore,
        lowestScore,
        topVendor: topProposal
          ? {
              name: topProposal.vendor.name,
              score: topProposal.aiScore as number,
            }
          : undefined,
      };
    } catch (error: any) {
      console.error("Proposal Service Error (getProposalStats):", error);
      throw new Error(`Failed to get proposal statistics: ${error.message}`);
    }
  }
}
