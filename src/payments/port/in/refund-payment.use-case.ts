import type { Payment } from '../../domain/payment';

/**
 * Reembolsa un pago: es la compensación del BFF cuando la compra falla después
 * de cobrar. Repetirla devuelve el mismo pago.
 */
export interface RefundPaymentUseCase {
  execute(id: string): Promise<Payment>;
}

export const REFUND_PAYMENT_USE_CASE = Symbol('REFUND_PAYMENT_USE_CASE');
