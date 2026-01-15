export interface RFPItem {
  name: string;
  quantity: number;
  specifications: Record<string, any>;
}

export interface StructuredRFP {
  title: string;
  description: string;
  items: RFPItem[];
  budget?: number;
  deliveryDays?: number;
  paymentTerms?: string;
  warrantyYears?: number;
  additionalRequirements?: string[];
}

export interface CreateRFPInput {
  naturalLanguagePrompt: string;
}

export interface CreateRFPResponse {
  id: string;
  title: string;
  rawPrompt: string;
  structuredData: StructuredRFP;
  budget?: number;
  deliveryDays?: number;
  paymentTerms?: string;
  warrantyYears?: number;
  createdAt: Date;
}

export interface SendRFPToVendorsInput {
  rfpId: string;
  vendorIds: string[];
}

export interface RFPWithVendors {
  id: string;
  title: string;
  structuredData: StructuredRFP;
  vendors: Vendor[];
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  status?: string;
  sentAt: Date;
}

export interface RFPComparison {
  rfpId: string;
  rfpTitle: string;
  proposals: Array<{
    id: string;
    vendorName: string;
    vendorEmail: string;
    totalPrice?: number;
    aiScore?: number;
    aiEvaluation?: string;
    extractedData: any;
    createdAt: Date;
  }>;
  aiRecommendations?: {
    recommendedVendorId: string;
    reasoning: string;
    comparisonSummary: string;
  };
}
