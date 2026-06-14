import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreditScoreService {
  constructor(private prisma: PrismaService) {}

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