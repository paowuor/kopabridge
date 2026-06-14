export interface NormalizedPayment {
  amount: number;
  status: string;
}

export interface NormalizedProviderData {
  provider: string;
  customerName: string;
  accountNumber: string;
  paymentHistory: NormalizedPayment[];
}