import { ApiProperty } from '@nestjs/swagger';
import { formatAmount } from '../../../../domain/money';
import type { Payment } from '../../../../domain/payment';

/**
 * Lo que ve quien llama. Separado del modelo de dominio a propósito: agregarle
 * un campo al dominio no debería cambiar el contrato público sin que alguien lo
 * decida.
 *
 * Es una clase y no un `type` porque OpenAPI se genera leyendo metadatos en
 * tiempo de ejecución.
 */
export class PaymentResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiProperty({ enum: ['AUTHORIZED', 'REFUNDED'] })
  status!: string;

  @ApiProperty({ example: 100.9 })
  amount!: number;

  @ApiProperty({ example: 'PEN' })
  currency!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export function toPaymentResponse(payment: Payment): PaymentResponse {
  return {
    id: payment.id,
    orderId: payment.orderId,
    status: payment.status,
    // Un número en el JSON, como el total de un pedido. El dominio lo lleva en
    // centavos, así que la conversión no pierde nada.
    amount: Number(formatAmount(payment.amount)),
    currency: payment.amount.currency,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}
