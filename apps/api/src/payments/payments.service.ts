import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePaymentDto) {
    const status = this.mapStatus(dto.status);

    return this.prisma.paymentHistory.create({
      data: {
        amount: dto.amount,
        status,
        dueDate: new Date(dto.dueDate),
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
        energyAccountId: dto.energyAccountId,
      },
    });
  }

  private mapStatus(rawStatus: string): PaymentStatus {
    const s = (rawStatus || '').toLowerCase();
    switch (s) {
      case 'paid':
        return PaymentStatus.PAID;
      case 'late':
        return PaymentStatus.LATE;
      case 'missed':
        return PaymentStatus.MISSED;
      case 'default':
        return PaymentStatus.DEFAULT;
      default:
        return PaymentStatus.PENDING;
    }
  }

  async findAll(limit?: number, skip?: number) {
    return this.prisma.paymentHistory.findMany({
      ...(limit !== undefined ? { take: limit } : {}),
      ...(skip !== undefined ? { skip } : {}),
      orderBy: { dueDate: 'desc' },
      include: {
        energyAccount: true,
      },
    });
  }

  async findAllForUser(userId: string, limit?: number, skip?: number) {
    return this.prisma.paymentHistory.findMany({
      where: {
        energyAccount: { userId },
      },
      ...(limit !== undefined ? { take: limit } : {}),
      ...(skip !== undefined ? { skip } : {}),
      orderBy: { dueDate: 'desc' },
      include: {
        energyAccount: true,
      },
    });
  }
}
