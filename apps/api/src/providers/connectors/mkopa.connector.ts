import { Injectable } from '@nestjs/common';
import { ProviderConnector } from './provider.connector';

@Injectable()
export class MkopaConnector implements ProviderConnector {
  async getAuthorizationUrl(userId: string): Promise<string> {
    return `https://mock-mkopa-oauth.com/auth?client_id=kopabridge&user=${userId}`;
  }

  async exchangeToken(code: string): Promise<string> {
    return `mock-token-${code}`;
  }

  async fetchCustomerData(accessToken: string): Promise<any> {
    return {
      provider: 'M-KOPA',
      customerName: 'Paul Owuor',
      accountNumber: 'MKP-93842',
      paymentHistory: [
        { amount: 500, status: 'paid' },
        { amount: 500, status: 'late' },
      ],
    };
  }
}