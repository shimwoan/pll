-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "webLink" TEXT;

-- CreateTable
CREATE TABLE "UserToken" (
    "id" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserToken_userEmail_key" ON "UserToken"("userEmail");
