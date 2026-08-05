import { Injectable } from '@nestjs/common';
import { ProviderConnector } from './provider.connector';

@Injectable()
export class MkopaConnector implements ProviderConnector {
  getAuthorizationUrl(userId: string, state: string): Promise<string> {
    return Promise.resolve(
      `https://mock-mkopa-oauth.com/auth?client_id=kopabridge&user=${userId}&state=${encodeURIComponent(state)}`,
    );
  }

  exchangeToken(code: string): Promise<string> {
    return Promise.resolve(`mock-token-${code}`);
  }

  fetchCustomerData(accessToken: string): Promise<any> {
    // The mock connector previously always returned the exact same
    // account number ("MKP-93842") no matter who connected. Since
    // EnergyAccount.accountNumber is unique and the sync worker upserts
    // on it, every user who connected M-KOPA would silently attach to
    // the SAME energy account (and its payment history), rather than
    // getting their own — a real cross-tenant data bug, not just a
    // cosmetic one. A real connector naturally avoids this because the
    // access token is bound to one real customer; here we derive a
    // pseudo-unique account number from the token so different demo
    // connections don't collide.
    const suffix =
      accessToken
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(-6)
        .toUpperCase() || 'DEMO01';

    return Promise.resolve({
      cust_name: 'Paul Owuor',
      acct_no: `MKP-${suffix}`,
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
