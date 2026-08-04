import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreditScoreService {
  constructor(private prisma: PrismaService) {}

  /**
   * Looks up just the owning userId for an energy account, so callers can
   * check ownership before exposing score data.
   */
  async findAccountOwner(energyAccountId: string) {
    const account = await this.prisma.energyAccount.findUnique({
      where: { id: energyAccountId },
      select: { id: true, userId: true },
    });

    if (!account) {
      throw new NotFoundException('Energy account not found');
    }

    return account;
  }

  async calculateScore(energyAccountId: string) {
    const payments = await this.prisma.paymentHistory.findMany({
      where: {
        energyAccountId,
      },
    });

    let score = 100;

    for (const payment of payments) {
      if (payment.status === 'late') {
        score -= 10;
      }

      if (payment.status === 'missed') {
        score -= 25;
      }

      if (payment.status === 'default') {
        score -= 40;
      }
    }

    score = Math.max(0, Math.min(score, 100));

    return {
      energyAccountId,
      totalPayments: payments.length,
      score,
      rating: this.getRating(score),
    };
  }

  private getRating(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 25) return 'Poor';
    return 'High Risk';
  }
}
