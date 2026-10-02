import { Inject, Injectable } from '@nestjs/common';
import { refunded, type Payment } from '../domain/payment';
import { PaymentErrors } from '../exception/payment-errors';
import type { RefundPaymentUseCase } from '../port/in/refund-payment.use-case';
import {
  PAYMENT_STORE_PORT,
  type PaymentStorePort,
} from '../port/out/payment-store.port';
import { PAYMENT_SETTINGS, type PaymentSettings } from './payment-settings';

/**
 * Reembolsa un pago. Un pago ya reembolsado responde igual: la compensación del
 * BFF puede llegar dos veces sin devolver el dinero dos veces.
 */
@Injectable()
export class RefundPaymentService implements RefundPaymentUseCase {
  constructor(
    @Inject(PAYMENT_STORE_PORT)
    private readonly payments: PaymentStorePort,
    @Inject(PAYMENT_SETTINGS)
    private readonly settings: PaymentSettings,
  ) {}

  async execute(id: string): Promise<Payment> {
    const payment = await this.payments.findById(id);
    if (payment === null) {
      throw PaymentErrors.notFound(id);
    }
    if (payment.status === 'REFUNDED') {
      return payment;
    }
    const done = refunded(payment, this.settings.now());
    await this.payments.update(done);
    return done;
  }
}
