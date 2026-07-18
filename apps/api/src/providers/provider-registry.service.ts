import { Injectable } from '@nestjs/common';
import { MkopaConnector } from './connectors/mkopa.connector';

@Injectable()
export class ProviderRegistryService {
  constructor(private readonly mkopaConnector: MkopaConnector) {}

  getConnector(providerSlug: string) {
    switch (providerSlug) {
      case 'm-kopa':
        return this.mkopaConnector;
      default:
        throw new Error('Provider not supported');
    }
  }
}
