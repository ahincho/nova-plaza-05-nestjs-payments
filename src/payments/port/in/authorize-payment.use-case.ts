import type { Money } from '../../domain/money';
import type { Payment } from '../../domain/payment';

/** Lo que pide el BFF para cobrar un pedido. */
export type AuthorizePayment = {
  readonly orderId: string;
  readonly customerId: string;
  readonly amount: Money;
};

/**
 * El pago del pedido, y si se creó ahora o ya existía: repetir el mismo cobro
 * devuelve el mismo pago.
 */
export type Authorization = {
  readonly payment: Payment;
  readonly created: boolean;
};

/** Autoriza el pago de un pedido, o lo rechaza si pasa el tope. */
export interface AuthorizePaymentUseCase {
  execute(command: AuthorizePayment): Promise<Authorization>;
}

export const AUTHORIZE_PAYMENT_USE_CASE = Symbol('AUTHORIZE_PAYMENT_USE_CASE');
