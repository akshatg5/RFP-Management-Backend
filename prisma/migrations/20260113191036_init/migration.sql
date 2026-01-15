-- CreateEnum
CREATE TYPE "RFPVendorStatus" AS ENUM ('DRAFT', 'SENT', 'RESPONDED');

-- CreateTable
CREATE TABLE "RequestForProposal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rawPrompt" TEXT NOT NULL,
    "structuredData" JSONB NOT NULL,
    "budget" DOUBLE PRECISION,
    "deliveryDays" INTEGER,
    "paymentTerms" TEXT,
    "warrantyYears" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestForProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RFPVendor" (
    "id" TEXT NOT NULL,
    "rfpId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "status" "RFPVendorStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "RFPVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "rfpId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "rawEmailBody" TEXT NOT NULL,
    "extractedData" JSONB NOT NULL,
    "aiScore" DOUBLE PRECISION,
    "aiEvaluation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_email_key" ON "Vendor"("email");

-- AddForeignKey
ALTER TABLE "RFPVendor" ADD CONSTRAINT "RFPVendor_rfpId_fkey" FOREIGN KEY ("rfpId") REFERENCES "RequestForProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFPVendor" ADD CONSTRAINT "RFPVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_rfpId_fkey" FOREIGN KEY ("rfpId") REFERENCES "RequestForProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
