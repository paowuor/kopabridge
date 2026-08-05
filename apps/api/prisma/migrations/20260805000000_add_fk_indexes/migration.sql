-- Add indexes on foreign-key scalar columns that Prisma does not index
-- automatically. These are queried frequently (consent lookups by
-- userId+revoked, payment history by energyAccountId, energy account
-- listings by userId/providerId) and were previously unindexed, forcing
-- sequential scans as tables grow.

CREATE INDEX "EnergyAccount_userId_idx" ON "EnergyAccount"("userId");
CREATE INDEX "EnergyAccount_providerId_idx" ON "EnergyAccount"("providerId");

CREATE INDEX "PaymentHistory_energyAccountId_idx" ON "PaymentHistory"("energyAccountId");

CREATE INDEX "ProviderConsent_userId_revoked_idx" ON "ProviderConsent"("userId", "revoked");
CREATE INDEX "ProviderConsent_providerId_idx" ON "ProviderConsent"("providerId");
