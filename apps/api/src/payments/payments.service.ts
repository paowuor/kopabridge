import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePaymentDto) {
    return this.prisma.paymentHistory.create({
      data: {
        amount: dto.amount,
        status: dto.status,
        dueDate: new Date(dto.dueDate),
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
        energyAccountId: dto.energyAccountId,
      },
    });
  }

  async findAll() {
    return this.prisma.paymentHistory.findMany({
      include: {
        energyAccount: true,
      },
    });
  }
}
