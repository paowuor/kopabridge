import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConsentsService {
  constructor(private prisma: PrismaService) {}

  async createConsent(
    userId: string,
    providerId: string,
    accessToken: string,
  ) {
    return this.prisma.providerConsent.create({
      data: {
        userId,
        providerId,
        accessToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revoked: false,
      },
    });
  }

  async revokeConsent(id: string) {
    return this.prisma.providerConsent.update({
      where: { id },
      data: {
        revoked: true,
      },
    });
  }

  async findActiveConsents(userId: string) {
    return this.prisma.providerConsent.findMany({
      where: {
        userId,
        revoked: false,
      },
      include: {
        provider: true,
      },
    });
  }
}