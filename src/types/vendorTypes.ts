export interface CreateVendorInput {
  name: string;
  email: string;
  notes?: string;
}

export interface UpdateVendorInput {
  name?: string;
  email?: string;
  notes?: string;
}

export interface VendorResponse {
  id: string;
  name: string;
  email: string;
  notes?: string;
  createdAt: Date;
}
