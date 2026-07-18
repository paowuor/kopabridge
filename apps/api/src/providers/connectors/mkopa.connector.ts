import { Injectable } from '@nestjs/common';
import { ProviderConnector } from './provider.connector';

@Injectable()
export class MkopaConnector implements ProviderConnector {
  getAuthorizationUrl(userId: string): Promise<string> {
    return Promise.resolve(
      `https://mock-mkopa-oauth.com/auth?client_id=kopabridge&user=${userId}`,
    );
  }

  exchangeToken(code: string): Promise<string> {
    return Promise.resolve(`mock-token-${code}`);
  }

  fetchCustomerData(accessToken: string): Promise<any> {
    void accessToken;

    return Promise.resolve({
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
    });
  }
}
