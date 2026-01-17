import { Request, Response } from "express";
import { RFPService } from "../services/rfpService";

const rfpService = new RFPService();

// POST /api/rfps/preview
// Preview RFP structure without saving to database
export const previewRFP = async (req: Request, res: Response) => {
  try {
    const { naturalLanguagePrompt } = req.body;

    if (!naturalLanguagePrompt || typeof naturalLanguagePrompt !== "string") {
      return res.status(400).json({
        success: false,
        error: "naturalLanguagePrompt is required and must be a string",
      });
    }

    const structuredData = await rfpService.previewRFP({ naturalLanguagePrompt });

    return res.status(200).json({
      success: true,
      data: structuredData,
    });
  } catch (error: any) {
    console.error("RFP Controller Error (Preview RFP):", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to preview RFP",
    });
  }
};

// POST /api/rfps
// create a new RFP from a natural language
export const createRFP = async (req: Request, res: Response) => {
  try {
    const { naturalLanguagePrompt } = req.body;

    if (!naturalLanguagePrompt || typeof naturalLanguagePrompt !== "string") {
      return res.status(400).json({
        success: false,
        error: "naturalLanguagePrompt is required and must be a string",
      });
    }

    const rfp = await rfpService.createRFP({ naturalLanguagePrompt });

    return res.status(201).json({
      success: true,
      data: rfp,
    });
  } catch (error: any) {
    console.error("RFP Controller Error ( Create RFP ):", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create RFP",
    });
  }
};

// GET /api/rfps
// Get all RFPs
export const getAllRFPs = async (req: Request, res: Response) => {
  try {
    const rfps = await rfpService.getAllRFPs();

    return res.status(200).json({
      success: true,
      data: rfps,
    });
  } catch (error: any) {
    console.error("RFP Controller Error (getAllRFPs):", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch RFPs",
    });
  }
};

// GET /api/rfps/:id
// Get RFP by ID
export const getRFPById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rfp = await rfpService.getRFPById(id);

    if (!rfp) {
      return res.status(404).json({
        success: false,
        error: "RFP not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rfp,
    });
  } catch (error: any) {
    console.error("RFP Controller Error (getRFPById):", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch RFP",
    });
  }
};

// GET /api/rfps/:id/vendors
// Get RFP with associated vendors
export const getRFPWithVendors = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rfp = await rfpService.getRFPWithVendors(id);

    if (!rfp) {
      return res.status(404).json({
        success: false,
        error: "RFP not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: rfp,
    });
  } catch (error: any) {
    console.error("RFP Controller Error (getRFPWithVendors):", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch RFP with vendors",
    });
  }
};

// POST /api/rfps/:id/send
// Send RFP to selected vendors
export const sendRFPToVendors = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { vendorIds } = req.body; // we can select this from frontend -> checkbox based UI or somehting

    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "vendorIds array is required and must not be empty",
      });
    }

    const result = await rfpService.sendRFPToVendors({
      rfpId: id,
      vendorIds,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("RFP Controller Error (sendRFPToVendors):", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to send RFP to vendors",
    });
  }
};

// POST /api/rfps/:id/proposals
// Process incoming vendor proposal
export const processVendorProposal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { vendorEmail, emailBody } = req.body;

    if (!vendorEmail || !emailBody) {
      return res.status(400).json({
        success: false,
        error: "vendorEmail and emailBody are required",
      });
    }

    const result = await rfpService.processVendorProposal(
      id,
      vendorEmail,
      emailBody
    );

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("RFP Controller Error (processVendorProposal):", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to process vendor proposal",
    });
  }
};

// GET /api/rfps/:id/compare
// Get comparison of all proposals for an RFP
export const compareProposals = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const comparison = await rfpService.compareProposals(id);

    return res.status(200).json({
      success: true,
      data: comparison,
    });
  } catch (error: any) {
    console.error("RFP Controller Error (compareProposals):", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to compare proposals",
    });
  }
};

// DELETE /api/rfps/:id
// Delete an RFP
export const deleteRFP = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await rfpService.deleteRFP(id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("RFP Controller Error (deleteRFP):", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete RFP",
    });
  }
};

// POST /api/rfps/:id/check-proposals
// Manually check for proposals in recent emails
export const checkForProposals = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await rfpService.checkForProposals(id);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("RFP Controller Error (checkForProposals):", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to check for proposals",
    });
  }
};
