import { sameMoney, type Money } from './money';

/** Un pago autorizado puede reembolsarse una vez; uno reembolsado ya terminó. */
export type PaymentStatus = 'AUTHORIZED' | 'REFUNDED';

/**
 * El pago simulado de un pedido (ADR-056). No habla con ninguna pasarela: lo
 * que decide si se autoriza es el tope, y eso lo resuelve el caso de uso.
 *
 * Un pedido tiene un solo pago. Es lo que permite que el BFF repita la compra
 * sin cobrar dos veces.
 */
export type Payment = {
  readonly id: string;
  readonly orderId: string;
  readonly customerId: string;
  readonly amount: Money;
  readonly status: PaymentStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

/** Un pago recién autorizado, todavía sin guardar. */
export function authorized(init: {
  id: string;
  orderId: string;
  customerId: string;
  amount: Money;
  now: Date;
}): Payment {
  return {
    id: init.id,
    orderId: init.orderId,
    customerId: init.customerId,
    amount: init.amount,
    status: 'AUTHORIZED',
    createdAt: init.now,
    updatedAt: init.now,
  };
}

/** El pago reembolsado. */
export function refunded(payment: Payment, now: Date): Payment {
  return { ...payment, status: 'REFUNDED', updatedAt: now };
}

/** Si el pago es el mismo cobro: el mismo monto en la misma moneda. */
export function chargesTheSame(payment: Payment, amount: Money): boolean {
  return sameMoney(payment.amount, amount);
}
