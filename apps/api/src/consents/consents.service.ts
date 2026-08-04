import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VaultService } from '../vault/vault.service';

@Injectable()
export class ConsentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultService: VaultService,
  ) {}

  /**
   * Fetches the bare consent record (no decrypted token) so callers can
   * check ownership before deciding whether to allow a mutation.
   */
  async findConsentOwner(id: string) {
    const consent = await this.prisma.providerConsent.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!consent) {
      throw new NotFoundException('Consent not found');
    }

    return consent;
  }

  async createConsent(userId: string, providerId: string, accessToken: string) {
    const encryptedToken = this.vaultService.encrypt(accessToken);

    return this.prisma.providerConsent.create({
      data: {
        userId,
        providerId,
        accessToken: encryptedToken, // 2. Store the encrypted string
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
    const consents = await this.prisma.providerConsent.findMany({
      where: {
        userId,
        revoked: false,
      },
      include: {
        provider: true,
      },
    });

    return consents.map((consent) => ({
      ...consent,
      accessToken: this.vaultService.decrypt(consent.accessToken),
    }));
  }
}
