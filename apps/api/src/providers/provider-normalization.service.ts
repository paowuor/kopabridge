import { Injectable } from '@nestjs/common';
import { MkopaNormalizer } from './normalizers/mkopa.normalizer';

@Injectable()
export class ProviderNormalizationService {
  constructor(
    private readonly mkopaNormalizer: MkopaNormalizer,
  ) {}

  normalize(providerSlug: string, data: any) {
    switch (providerSlug) {
      case 'm-kopa':
        return this.mkopaNormalizer.normalize(data);
      default:
        throw new Error('Normalizer not found');
    }
  }
}