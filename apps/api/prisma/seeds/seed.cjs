const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@kopabridge.com' },
    update: {},
    create: {
      email: 'demo@kopabridge.com',
      password: hashedPassword,
      role: 'user',
    },
  });

  const adminPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@kopabridge.com' },
    update: {},
    create: {
      email: 'admin@kopabridge.com',
      password: adminPassword,
      role: 'admin',
    },
  });

  const provider = await prisma.provider.upsert({
    where: { slug: 'm-kopa' },
    update: {},
    create: {
      name: 'M-KOPA',
      slug: 'm-kopa',
      apiBaseUrl: 'https://api.mkopa.com',
    },
  });

  const energyAccount = await prisma.energyAccount.upsert({
    where: { accountNumber: 'MKP-93842' },
    update: {},
    create: {
      accountNumber: 'MKP-93842',
      deviceId: 'BAT-00192',
      customerName: 'Demo Customer',
      userId: user.id,
      providerId: provider.id,
    },
  });

  const existingPayments = await prisma.paymentHistory.count({
    where: {
      energyAccountId: energyAccount.id,
    },
  });

  if (existingPayments === 0) {
    await prisma.paymentHistory.createMany({
      data: [
        {
          amount: 500,
          status: 'paid',
          dueDate: new Date('2026-06-01'),
          paidAt: new Date('2026-05-31'),
          energyAccountId: energyAccount.id,
        },
        {
          amount: 500,
          status: 'late',
          dueDate: new Date('2026-06-08'),
          paidAt: new Date('2026-06-10'),
          energyAccountId: energyAccount.id,
        },
        {
          amount: 500,
          status: 'missed',
          dueDate: new Date('2026-06-15'),
          energyAccountId: energyAccount.id,
        },
      ],
    });
  }

  console.log('✅ Seed completed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
