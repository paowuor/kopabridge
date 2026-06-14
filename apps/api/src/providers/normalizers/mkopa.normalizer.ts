import { Injectable } from '@nestjs/common';
import { ProviderNormalizer } from './provider-normalizer.interface';
import { NormalizedProviderData } from './normalized-provider.dto';

@Injectable()
export class MkopaNormalizer implements ProviderNormalizer {
  normalize(data: any): NormalizedProviderData {
    return {
      provider: 'M-KOPA',
      customerName: data.cust_name,
      accountNumber: data.acct_no,
      paymentHistory: data.payments.map((payment) => ({
        amount: payment.amt,
        status: payment.state,
      })),
    };
  }
}