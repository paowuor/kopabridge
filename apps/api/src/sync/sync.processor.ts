import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { VaultService } from '../vault/vault.service';
import { ProviderRegistryService } from '../providers/provider-registry.service';
import { ProviderNormalizationService } from '../providers/provider-normalization.service';
import { CreditScoreService } from '../credit-score/credit-score.service';
import { SyncJobData } from './sync.service';

@Processor('provider-sync')
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: VaultService,
    private readonly registry: ProviderRegistryService,
    private readonly normalizationService: ProviderNormalizationService,
    private readonly creditScoreService: CreditScoreService,
  ) {
    super();
  }

  /**
   * The core execution loop triggered automatically whenever a new job
   * is pushed to the 'provider-sync' queue channel.
   */
  async process(job: Job<SyncJobData, unknown, string>): Promise<{
    success: boolean;
  }> {
    this.logger.log(
      `[Job Started] Processing job #${job.id} of type: "${job.name}"`,
    );
    // Only log non-sensitive identifiers — job.data never contains a
    // plaintext token (see SyncService.enqueueInitialSync).
    const { userId, providerId } = job.data;
    this.logger.debug(
      `Job Payload Context: userId=${userId} providerId=${providerId}`,
    );

    switch (job.name) {
      case 'initial-sync':
      case 'scheduled-refresh':
        await this.runSync(userId, providerId);
        break;

      default:
        this.logger.warn(`Unknown job type received: "${job.name}"`);
        return { success: false };
    }

    this.logger.log(`[Job Completed] Job #${job.id} processed successfully.`);
    return { success: true };
  }

  private async runSync(userId: string, providerId: string): Promise<void> {
    // 1. Load the active consent for this user/provider pair.
    const consent = await this.prisma.providerConsent.findFirst({
      where: { userId, providerId, revoked: false },
      include: { provider: true },
    });

    if (!consent) {
      this.logger.warn(
        `No active consent found for user ${userId} / provider ${providerId}; skipping sync.`,
      );
      return;
    }

    if (consent.expiresAt < new Date()) {
      this.logger.warn(
        `Consent for user ${userId} / provider ${providerId} has expired; skipping sync.`,
      );
      return;
    }

    // 2. Decrypt the token securely — it's only ever held in memory here,
    // never logged, and never persisted in plaintext.
    const accessToken = this.vault.decrypt(consent.accessToken);

    // 3. Fetch & normalize vendor data.
    const connector = this.registry.getConnector(consent.provider.slug);
    const rawData: unknown = await connector.fetchCustomerData(accessToken);
    const normalized = this.normalizationService.normalize(
      consent.provider.slug,
      rawData as Parameters<ProviderNormalizationService['normalize']>[1],
    );

    // 4. Upsert the energy account this data belongs to.
    //
    // NOTE: the current mock connector doesn't return real device
    // telemetry (deviceId) or payment due dates/references, so those
    // fields are synthesized below. This is a known limitation to
    // revisit once a real provider integration supplies them.
    const energyAccount = await this.prisma.energyAccount.upsert({
      where: { accountNumber: normalized.accountNumber },
      update: {
        customerName: normalized.customerName,
        isActive: true,
      },
      create: {
        accountNumber: normalized.accountNumber,
        deviceId: `${consent.provider.slug}-${normalized.accountNumber}`,
        customerName: normalized.customerName,
        userId,
        providerId,
      },
    });

    // 5. Save payment metrics. Upserted on a synthetic, deterministic
    // paymentReference so re-running a sync (e.g. scheduled-refresh)
    // doesn't create duplicate rows — a real integration should use the
    // provider's own transaction/reference id here instead.
    for (const [index, payment] of normalized.paymentHistory.entries()) {
      const paymentReference = `${consent.provider.slug}-${normalized.accountNumber}-${index}`;

      await this.prisma.paymentHistory.upsert({
        where: { paymentReference },
        update: {
          amount: payment.amount,
          status: payment.status,
        },
        create: {
          amount: payment.amount,
          status: payment.status,
          dueDate: new Date(),
          paymentReference,
          energyAccountId: energyAccount.id,
        },
      });
    }

    // 6. Recalculate the credit score off the freshly-synced data.
    const score = await this.creditScoreService.calculateScore(
      energyAccount.id,
    );
    this.logger.log(
      `Recalculated score for energy account ${energyAccount.id}: ${score.score} (${score.rating})`,
    );
  }
}
