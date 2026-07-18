import { Injectable } from '@nestjs/common';
import { MkopaNormalizer } from './normalizers/mkopa.normalizer';
import { NormalizedProviderData } from './normalizers/normalized-provider.dto';

interface ProviderPayload {
  cust_name: string;
  acct_no: string;
  payments: Array<{ amt: number; state: string }>;
}

@Injectable()
export class ProviderNormalizationService {
  constructor(private readonly mkopaNormalizer: MkopaNormalizer) {}

  normalize(
    providerSlug: string,
    data: ProviderPayload,
  ): NormalizedProviderData {
    switch (providerSlug) {
      case 'm-kopa':
        return this.mkopaNormalizer.normalize(data);
      default:
        throw new Error('Normalizer not found');
    }
  }
}
