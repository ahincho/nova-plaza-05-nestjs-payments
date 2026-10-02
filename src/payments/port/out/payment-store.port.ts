import type { Payment } from '../../domain/payment';

/**
 * Los pagos guardados, dichos en términos del dominio: el adaptador traduce a
 * filas, y el núcleo no sabe que hay una base.
 */
export interface PaymentStorePort {
  findById(id: string): Promise<Payment | null>;

  findByOrderId(orderId: string): Promise<Payment | null>;

  /**
   * Guarda un pago nuevo. Devuelve `false` si el pedido ya tiene uno: dos
   * cobros simultáneos del mismo pedido los separa la base, no el código.
   */
  insert(payment: Payment): Promise<boolean>;

  update(payment: Payment): Promise<void>;
}

export const PAYMENT_STORE_PORT = Symbol('PAYMENT_STORE_PORT');
