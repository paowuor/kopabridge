import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  // Inject the 'provider-sync' queue registered in SyncModule
  constructor(
    @InjectQueue('provider-sync') private readonly syncQueue: Queue,
  ) {}

  /**
   * Enqueues an initial synchronization task following a successful OAuth connection
   */
  async enqueueInitialSync(userId: string, providerId: string, token: string) {
    this.logger.log(`Queueing initial sync job for user ${userId} and provider ${providerId}`);
    
    // Add the job to the queue. 
    // Format: queue.add('job-name', payload_data, options)
    const job = await this.syncQueue.add(
      'initial-sync',
      {
        userId,
        providerId,
        token,
      },
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