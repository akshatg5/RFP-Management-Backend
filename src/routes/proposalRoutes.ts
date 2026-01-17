import { Router } from "express";
import { ProposalService } from "../services/proposalService";
import { EmailService } from "../services/emailService";

const router = Router();
const proposalService = new ProposalService();
const emailService = new EmailService();

// Get all proposals
router.get("/", async (req, res) => {
  try {
    const proposals = await proposalService.getAllProposals();
    res.status(200).json({ success: true, data: proposals });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get proposal by ID
router.get("/:id", async (req, res) => {
  try {
    const proposal = await proposalService.getProposalById(req.params.id);
    if (!proposal) {
      return res
        .status(404)
        .json({ success: false, error: "Proposal not found" });
    }
    res.status(200).json({ success: true, data: proposal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get proposals by RFP
router.get("/rfp/:rfpId", async (req, res) => {
  try {
    const proposals = await proposalService.getProposalsByRFP(req.params.rfpId);
    res.status(200).json({ success: true, data: proposals });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get proposals by vendor
router.get("/vendor/:vendorId", async (req, res) => {
  try {
    const proposals = await proposalService.getProposalsByVendor(
      req.params.vendorId
    );
    res.status(200).json({ success: true, data: proposals });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete proposal
router.delete("/:id", async (req, res) => {
  try {
    const result = await proposalService.deleteProposal(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get proposal stats
router.get("/rfp/:rfpId/stats", async (req, res) => {
  try {
    const stats = await proposalService.getProposalStats(req.params.rfpId);
    res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get webhook events (received proposals)
router.get("/webhook-events", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const events = await emailService.getWebhookEvents(limit);
    res.status(200).json({ success: true, data: events });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
