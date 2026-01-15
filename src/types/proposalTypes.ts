export interface ProposalResponse {
  id: string;
  rfpId: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  rawEmailBody: string;
  extractedData: any;
  aiScore?: number;
  aiEvaluation?: string;
  createdAt: Date;
}
