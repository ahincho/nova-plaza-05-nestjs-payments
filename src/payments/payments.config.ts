import { registerAs } from '@nestjs/config';

/**
 * La configuración de pagos. El tope es lo que hace predecible el rechazo: la
 * demo de Plaza lo usa para mostrar la compensación a pedido (ADR-056).
 */
export const paymentsConfig = registerAs('payments', () => ({
  /** El monto más alto que se autoriza, en la moneda de cada pago. */
  maxAmount: process.env['PAYMENTS_MAX_AMOUNT'] ?? '1000',
}));
