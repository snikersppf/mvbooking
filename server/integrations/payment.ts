import { randomUUID } from "node:crypto";

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "REFUNDED";

export type CreatePaymentInput = Readonly<{
  bookingId: string;
  amount: string;
  currency: string;
}>;

export type CreatePaymentResult = Readonly<{
  paymentId: string;
  status: PaymentStatus;
}>;

export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  refundPayment(paymentId: string): Promise<void>;
}

/** Test-only implementation. It never takes or transfers money. */
export class MockPaymentProvider implements PaymentProvider {
  private readonly payments = new Map<string, PaymentStatus>();

  async createPayment(_input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const paymentId = randomUUID();
    this.payments.set(paymentId, "PENDING");
    return { paymentId, status: "PENDING" };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const status = this.payments.get(paymentId);
    if (!status) throw new Error("Mock payment not found.");
    return status;
  }

  async refundPayment(paymentId: string): Promise<void> {
    if (!this.payments.has(paymentId)) {
      throw new Error("Mock payment not found.");
    }
    this.payments.set(paymentId, "REFUNDED");
  }
}
