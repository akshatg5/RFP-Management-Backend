import { Request, Response, Router } from "express";
import { VendorService } from "../services/vendorService";

const router = Router();
const vendorService = new VendorService();

// create vendor
router.post("/", async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.createVendor(req.body);
    res.status(201).json({ success: true, data: vendor });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all vendors
router.get("/", async (req: Request, res: Response) => {
  try {
    const vendors = await vendorService.getAllVendors();
    res.status(200).json({ success: true, data: vendors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get vendor by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.getVendorById(req.params.id);
    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, error: "Vendor not found" });
    }
    res.status(200).json({ success: true, data: vendor });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Vendor
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.updateVendor(req.params.id, req.body);
    res.status(200).json({ success: true, data: vendor });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete Vendor
router.delete("/:id", async (req, res) => {
  try {
    const result = await vendorService.deleteVendor(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search vendors
router.get("/search/:query", async (req, res) => {
  try {
    const vendors = await vendorService.searchVendors(req.params.query);
    res.status(200).json({ success: true, data: vendors });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
