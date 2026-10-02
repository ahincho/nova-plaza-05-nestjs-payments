import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsUUID, Matches } from 'class-validator';

/**
 * El cuerpo de un cobro. Lo arma el BFF con el total del pedido que acaba de
 * crear, así que el monto es el que fijó el catálogo, no el cliente.
 */
export class AuthorizePaymentRequest {
  @ApiProperty({
    format: 'uuid',
    example: '0199a7e2-1c3b-7d4e-8f00-123456789abc',
  })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ example: 100.9, description: 'Con hasta dos decimales' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiProperty({ example: 'PEN', description: 'ISO 4217' })
  @Matches(/^[A-Z]{3}$/, { message: 'Debe ser un código ISO 4217, como PEN' })
  currency!: string;
}
