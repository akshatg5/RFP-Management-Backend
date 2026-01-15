import { prismaClient } from "../lib/prisma";
import {
  CreateVendorInput,
  UpdateVendorInput,
  VendorResponse,
} from "../types/vendorTypes";

export class VendorService {
  // create a new vendor
  async createVendor(input: CreateVendorInput) {
    try {
      // check if already exists
      const existingVendor = await prismaClient.vendor.findUnique({
        where: {
          email: input.email,
        },
      });

      if (existingVendor) {
        throw new Error(`Vendor with email ${input.email} already exists`);
      }

      // create a new vendor
      const vendor = await prismaClient.vendor.create({
        data: {
          email: input.email,
          name: input.name,
          notes: input.notes,
        },
      });

      return {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        notes: vendor.notes ?? undefined,
        createdAt: vendor.createdAt,
      };
    } catch (error: any) {
      console.error("Vendor Service Error (createVendor):", error);
      throw new Error(`Failed to create vendor: ${error.message}`);
    }
  }

  // get vendor by id
  async getVendorById(vendorId: string): Promise<VendorResponse | null> {
    try {
      const vendor = await prismaClient.vendor.findUnique({
        where: { id: vendorId },
      });

      if (!vendor) {
        return null;
      }

      return {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        notes: vendor.notes ?? undefined,
        createdAt: vendor.createdAt,
      };
    } catch (error: any) {
      console.error("Vendor Service Error (getVendorById):", error);
      throw new Error(`Failed to fetch vendor: ${error.message}`);
    }
  }

  // get vendor by email
  async getVendorByEmail(email: string): Promise<VendorResponse | null> {
    try {
      const vendor = await prismaClient.vendor.findUnique({
        where: { email },
      });

      if (!vendor) {
        return null;
      }

      return {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        notes: vendor.notes ?? undefined,
        createdAt: vendor.createdAt,
      };
    } catch (error: any) {
      console.error("Vendor Service Error (getVendorByEmail):", error);
      throw new Error(`Failed to fetch vendor: ${error.message}`);
    }
  }

  // get all the vendors
  async getAllVendors(): Promise<VendorResponse[]> {
    try {
      const vendors = await prismaClient.vendor.findMany({
        orderBy: { createdAt: "desc" },
      });

      return vendors.map((vendor: any) => ({
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        notes: vendor.notes ?? undefined,
        createdAt: vendor.createdAt,
      }));
    } catch (error: any) {
      console.error("Vendor Service Error (getAllVendors):", error);
      throw new Error(`Failed to fetch vendors: ${error.message}`);
    }
  }

  // update vendor
  async updateVendor(
    vendorId: string,
    input: UpdateVendorInput
  ): Promise<VendorResponse> {
    try {
      // If email is being updated, check if it's already taken
      if (input.email) {
        const existingVendor = await prismaClient.vendor.findFirst({
          where: {
            email: input.email,
            id: { not: vendorId },
          },
        });

        if (existingVendor) {
          throw new Error(
            `Email ${input.email} is already taken by another vendor`
          );
        }
      }

      const vendor = await prismaClient.vendor.update({
        where: { id: vendorId },
        data: input,
      });

      return {
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        notes: vendor.notes ?? undefined,
        createdAt: vendor.createdAt,
      };
    } catch (error: any) {
      console.error("Vendor Service Error (updateVendor):", error);
      throw new Error(`Failed to update vendor: ${error.message}`);
    }
  }

  // delete vendor
  async deleteVendor(vendorId: string): Promise<{ success: boolean }> {
    try {
      // Check if vendor has any proposals
      const proposalCount = await prismaClient.proposal.count({
        where: { vendorId },
      });

      if (proposalCount > 0) {
        throw new Error(
          "Cannot delete vendor with existing proposals. Delete proposals first."
        );
      }

      // Delete RFPVendor records
      await prismaClient.rFPVendor.deleteMany({
        where: { vendorId },
      });

      // Delete vendor
      await prismaClient.vendor.delete({
        where: { id: vendorId },
      });

      return { success: true };
    } catch (error: any) {
      console.error("Vendor Service Error (deleteVendor):", error);
      throw new Error(`Failed to delete vendor: ${error.message}`);
    }
  }

  // search vendors by name or email
  async searchVendors(query: string): Promise<VendorResponse[]> {
    try {
      const vendors = await prismaClient.vendor.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        orderBy: { name: "asc" },
      });

      return vendors.map((vendor: any) => ({
        id: vendor.id,
        name: vendor.name,
        email: vendor.email,
        notes: vendor.notes ?? undefined,
        createdAt: vendor.createdAt,
      }));
    } catch (error: any) {
      console.error("Vendor Service Error (searchVendors):", error);
      throw new Error(`Failed to search vendors: ${error.message}`);
    }
  }
}
