import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreditScoreService } from '../credit-score/credit-score.service';

@Injectable()
export class CreditProfileService {
  constructor(
    private prisma: PrismaService,
    private creditScoreService: CreditScoreService,
  ) {}

  async getCreditProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        energyAccounts: {
          include: {
            provider: true,
            payments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const energyAccounts = user.energyAccounts;

    const providers = energyAccounts.map((account) => account.provider);

    const payments = energyAccounts.flatMap((account) => account.payments);

    const paid = payments.filter((p) => p.status === 'paid').length;
    const late = payments.filter((p) => p.status === 'late').length;
    const missed = payments.filter((p) => p.status === 'missed').length;

    let creditScore: {
      energyAccountId: string;
      totalPayments: number;
      score: number;
      rating: string;
    } | null = null;

    if (energyAccounts.length > 0) {
      creditScore = await this.creditScoreService.calculateScore(
        energyAccounts[0].id,
      );
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      providers,
      energyAccounts,
      paymentSummary: {
        totalPayments: payments.length,
        paid,
        late,
        missed,
      },
      creditScore,
    };
  }
}
