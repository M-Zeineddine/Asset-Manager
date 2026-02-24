export type PaymentRequest = {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
};

export type PaymentResult = {
  success: boolean;
  providerPaymentId?: string;
  errorMessage?: string;
};

export interface PaymentProvider {
  pay(request: PaymentRequest): Promise<PaymentResult>;
}

export class MockPaymentProvider implements PaymentProvider {
  async pay(_request: PaymentRequest): Promise<PaymentResult> {
    return {
      success: true,
      providerPaymentId: `mock_${Date.now()}`,
    };
  }
}

export class StripePaymentProvider implements PaymentProvider {
  async pay(_request: PaymentRequest): Promise<PaymentResult> {
    return {
      success: false,
      errorMessage: "Stripe payment not configured. TODO: add keys and flow.",
    };
  }
}

export const paymentProvider: PaymentProvider = new MockPaymentProvider();
