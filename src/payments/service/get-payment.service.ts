import { Inject, Injectable } from '@nestjs/common';
import type { Payment } from '../domain/payment';
import { PaymentErrors } from '../exception/payment-errors';
import type { GetPaymentUseCase } from '../port/in/get-payment.use-case';
import {
  PAYMENT_STORE_PORT,
  type PaymentStorePort,
} from '../port/out/payment-store.port';

@Injectable()
export class GetPaymentService implements GetPaymentUseCase {
  constructor(
    @Inject(PAYMENT_STORE_PORT)
    private readonly payments: PaymentStorePort,
  ) {}

  async execute(id: string): Promise<Payment> {
    const payment = await this.payments.findById(id);

    // El puerto devuelve null cuando no existe, y es el caso de uso quien
    // decide que eso es un 404 de dominio. El adaptador no conoce códigos HTTP.
    if (payment === null) {
      throw PaymentErrors.notFound(id);
    }
    return payment;
  }
}
