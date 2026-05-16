-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING_REVIEW', 'CONFIRMED', 'EDITED', 'UNCLASSIFIED');

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "claimNumber" TEXT,
    "clientName" TEXT NOT NULL,
    "handler" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'Claim',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyPreview" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "aiCategory" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "aiReason" TEXT,
    "finalCategory" TEXT,
    "workTypeTitle" TEXT,
    "matchedCaseId" TEXT,
    "matchMethod" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Case_caseNumber_key" ON "Case"("caseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Email_messageId_key" ON "Email"("messageId");

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_matchedCaseId_fkey" FOREIGN KEY ("matchedCaseId") REFERENCES "Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;
