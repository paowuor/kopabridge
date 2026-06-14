-- CreateTable
CREATE TABLE "EnergyAccount" (
    "id" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnergyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnergyAccount_accountNumber_key" ON "EnergyAccount"("accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EnergyAccount_deviceId_key" ON "EnergyAccount"("deviceId");

-- AddForeignKey
ALTER TABLE "EnergyAccount" ADD CONSTRAINT "EnergyAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyAccount" ADD CONSTRAINT "EnergyAccount_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
