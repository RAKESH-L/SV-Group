CREATE TYPE "InformationEnquiryStatus" AS ENUM ('NEW', 'REVIEWED', 'CLOSED');
CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

CREATE TABLE "InformationEnquiry" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "message" TEXT,
    "productNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "consentAt" TIMESTAMP(3) NOT NULL,
    "status" "InformationEnquiryStatus" NOT NULL DEFAULT 'NEW',
    "emailStatus" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "emailMessageId" TEXT,
    "emailErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InformationEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InformationEnquiry_reference_key" ON "InformationEnquiry"("reference");
CREATE UNIQUE INDEX "InformationEnquiry_idempotencyKey_key" ON "InformationEnquiry"("idempotencyKey");
CREATE INDEX "InformationEnquiry_status_createdAt_idx" ON "InformationEnquiry"("status", "createdAt");
CREATE INDEX "InformationEnquiry_emailStatus_createdAt_idx" ON "InformationEnquiry"("emailStatus", "createdAt");
CREATE INDEX "InformationEnquiry_mobile_createdAt_idx" ON "InformationEnquiry"("mobile", "createdAt");
