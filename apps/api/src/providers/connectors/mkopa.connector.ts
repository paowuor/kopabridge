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
    cust_name: 'Paul Owuor',
    acct_no: 'MKP-93842',
    payments: [
      {
        amt: 500,
        state: 'paid',
      },
      {
        amt: 500,
        state: 'late',
      },
    ],
  };
}
}