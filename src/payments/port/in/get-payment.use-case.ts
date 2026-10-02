import type { Payment } from '../../domain/payment';

/** Devuelve un pago. */
export interface GetPaymentUseCase {
  execute(id: string): Promise<Payment>;
}

export const GET_PAYMENT_USE_CASE = Symbol('GET_PAYMENT_USE_CASE');
