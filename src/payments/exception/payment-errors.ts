import { DomainError } from '@ahincho/nova-nestjs';

/**
 * Los errores del dominio de pagos (ADR-031). Cada uno lleva su código, y el
 * filtro global de Nova lo responde con el sobre y el status de su tipo, igual
 * que en pedidos y en el catálogo.
 */
export const PaymentErrors = {
  /** 404: el pago no existe. */
  notFound(id: string): DomainError {
    return DomainError.notFound(`El pago ${id} no existe`, {
      code: 'PAYMENT_NOT_FOUND',
    });
  },

  /** 422: el monto pasa el tope, y el pago se rechaza. */
  declined(amount: string, currency: string, limit: string): DomainError {
    return DomainError.ruleViolation(
      `El pago de ${amount} ${currency} pasa el tope de ${limit} y se rechazó`,
      { code: 'PAYMENT_DECLINED' },
    );
  },

  /** 409: el pedido ya tiene un pago por otro monto. */
  conflict(orderId: string): DomainError {
    return DomainError.conflict(
      `El pedido ${orderId} ya tiene un pago por otro monto`,
      { code: 'PAYMENT_CONFLICT' },
    );
  },
};
