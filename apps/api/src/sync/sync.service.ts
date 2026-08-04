import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface SyncJobData {
  userId: string;
  providerId: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  // Inject the 'provider-sync' queue registered in SyncModule
  constructor(
    @InjectQueue('provider-sync') private readonly syncQueue: Queue,
  ) {}

  /**
   * Enqueues an initial synchronization task following a successful OAuth
   * connection. Deliberately does NOT take the access token as an
   * argument — the token is already persisted (encrypted) via
   * ConsentsService by this point, so the worker re-reads and decrypts it
   * from the database instead of carrying plaintext credentials through
   * Redis job data.
   */
  async enqueueInitialSync(userId: string, providerId: string) {
    this.logger.log(
      `Queueing initial sync job for user ${userId} and provider ${providerId}`,
    );

    const job = await this.syncQueue.add(
      'initial-sync',
      { userId, providerId } satisfies SyncJobData,
      {
        attempts: 3, // Automatically retry 3 times if the provider API is down
        backoff: {
          type: 'exponential',
          delay: 5000, // Wait 5s, then 10s, then 20s...
        },
      },
    );

    return job.id;
  }
}
