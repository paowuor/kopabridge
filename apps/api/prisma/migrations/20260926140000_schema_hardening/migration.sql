-- 1. Create Enums
CREATE TYPE "Role" AS ENUM ('user', 'admin', 'provider');
CREATE TYPE "PaymentStatus" AS ENUM ('paid', 'late', 'missed', 'default', 'pending');

-- 2. Alter User table
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Convert User.role to Role enum safely
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user'::"Role";

CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- 3. Alter EnergyAccount table
ALTER TABLE "EnergyAccount" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
DROP INDEX IF EXISTS "EnergyAccount_userId_idx";
CREATE INDEX "EnergyAccount_userId_isActive_idx" ON "EnergyAccount"("userId", "isActive");

-- 4. Alter PaymentHistory table
-- Add updatedAt with default of createdAt for existing rows
ALTER TABLE "PaymentHistory" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Convert amount from DOUBLE PRECISION to DECIMAL(12, 2)
ALTER TABLE "PaymentHistory" ALTER COLUMN "amount" TYPE DECIMAL(12, 2) USING ("amount"::numeric(12, 2));

-- Convert currency column to VARCHAR(3)
ALTER TABLE "PaymentHistory" ALTER COLUMN "currency" TYPE VARCHAR(3);

-- Convert status to PaymentStatus enum safely
ALTER TABLE "PaymentHistory" ALTER COLUMN "status" TYPE "PaymentStatus" USING (
  CASE lower("status")
    WHEN 'paid' THEN 'paid'::"PaymentStatus"
    WHEN 'late' THEN 'late'::"PaymentStatus"
    WHEN 'missed' THEN 'missed'::"PaymentStatus"
    WHEN 'default' THEN 'default'::"PaymentStatus"
    ELSE 'pending'::"PaymentStatus"
  END
);

-- Add check constraint for non-negative payments
ALTER TABLE "PaymentHistory" ADD CONSTRAINT "PaymentHistory_amount_check" CHECK ("amount" >= 0);

-- Composite indexes for payment history
CREATE INDEX "PaymentHistory_energyAccountId_status_idx" ON "PaymentHistory"("energyAccountId", "status");
CREATE INDEX "PaymentHistory_energyAccountId_dueDate_idx" ON "PaymentHistory"("energyAccountId", "dueDate" DESC);

-- 5. Alter ProviderConsent table
ALTER TABLE "ProviderConsent" ADD COLUMN "revokedAt" TIMESTAMP(3);
ALTER TABLE "ProviderConsent" ALTER COLUMN "revoked" SET DEFAULT false;

-- Composite indexes for provider consents
DROP INDEX IF EXISTS "ProviderConsent_userId_revoked_idx";
CREATE INDEX "ProviderConsent_userId_providerId_revoked_idx" ON "ProviderConsent"("userId", "providerId", "revoked");
CREATE INDEX "ProviderConsent_userId_revoked_expiresAt_idx" ON "ProviderConsent"("userId", "revoked", "expiresAt");

-- Unique partial index: at most one active (unrevoked) consent per user and provider
CREATE UNIQUE INDEX "ProviderConsent_active_user_provider_key" ON "ProviderConsent"("userId", "providerId") WHERE "revoked" = false;
