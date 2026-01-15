import { Router } from "express";
import {
  compareProposals,
  createRFP,
  deleteRFP,
  getAllRFPs,
  getRFPById,
  getRFPWithVendors,
  processVendorProposal,
  sendRFPToVendors,
} from "../controllers/rfpControllers";

const router = Router();

router.post("/", createRFP);
router.get("/", getAllRFPs);
router.get("/:id", getRFPById);
router.get("/:id/vendors", getRFPWithVendors);
router.post("/:id/send", sendRFPToVendors);
router.post("/:id/proposals", processVendorProposal);
router.get("/:id/compare", compareProposals);
router.delete("/:id", deleteRFP);

export default router;
