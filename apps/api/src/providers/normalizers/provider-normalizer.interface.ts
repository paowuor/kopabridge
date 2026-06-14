import { NormalizedProviderData } from './normalized-provider.dto';

export interface ProviderNormalizer {
  normalize(data: any): NormalizedProviderData;
}