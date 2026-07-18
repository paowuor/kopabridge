import { Injectable } from '@nestjs/common';
import { ProviderNormalizer } from './provider-normalizer.interface';
import { NormalizedProviderData } from './normalized-provider.dto';

interface MkopaRawData {
  cust_name: string;
  acct_no: string;
  payments: Array<{ amt: number; state: string }>;
}

@Injectable()
export class MkopaNormalizer implements ProviderNormalizer {
  normalize(data: MkopaRawData): NormalizedProviderData {
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
