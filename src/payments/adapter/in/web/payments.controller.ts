import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import { ApiEnvelope, ApiErrors, ApplicationError } from '@ahincho/nova-nestjs';
import { money } from '../../../domain/money';
import {
  AUTHORIZE_PAYMENT_USE_CASE,
  type AuthorizePaymentUseCase,
} from '../../../port/in/authorize-payment.use-case';
import {
  GET_PAYMENT_USE_CASE,
  type GetPaymentUseCase,
} from '../../../port/in/get-payment.use-case';
import {
  REFUND_PAYMENT_USE_CASE,
  type RefundPaymentUseCase,
} from '../../../port/in/refund-payment.use-case';
import { AuthorizePaymentRequest } from './request/authorize-payment.request';
import {
  PaymentResponse,
  toPaymentResponse,
} from './response/payment.response';

/**
 * Lo único que el controlador usa de la respuesta HTTP: fijar el status. Se
 * declara por su forma para no atar el adaptador a Express.
 */
export type StatusSetter = { status(code: number): unknown };

/** El cliente que el BFF autenticó, como en pedidos y en el catálogo. */
export const CUSTOMER_HEADER = 'x-customer-id';

/**
 * Los pagos. Los llama solo el BFF. Devuelve la respuesta pelada: el sobre lo
 * pone el interceptor global de la plataforma.
 */
@Controller('payments')
export class PaymentsController {
  /**
   * Depende de los puertos de entrada y no de las clases de los servicios: el
   * controlador es un adaptador.
   */
  constructor(
    @Inject(AUTHORIZE_PAYMENT_USE_CASE)
    private readonly authorizePayment: AuthorizePaymentUseCase,
    @Inject(GET_PAYMENT_USE_CASE)
    private readonly getPayment: GetPaymentUseCase,
    @Inject(REFUND_PAYMENT_USE_CASE)
    private readonly refundPayment: RefundPaymentUseCase,
  ) {}

  /**
   * Autoriza el pago de un pedido: 201 si es nuevo y 200 si repite un cobro que
   * ya existía. Sobre el tope, 422 `PAYMENT_DECLINED`; el mismo pedido por otro
   * monto, 409 `PAYMENT_CONFLICT`.
   */
  @Post()
  @ApiEnvelope(PaymentResponse, {
    status: 201,
    description: 'El pago autorizado',
  })
  @ApiErrors(400, 409, 422)
  async authorize(
    @Headers(CUSTOMER_HEADER) customerId: string | undefined,
    @Body() request: AuthorizePaymentRequest,
    @Res({ passthrough: true }) response: StatusSetter,
  ): Promise<PaymentResponse> {
    if (customerId === undefined || customerId.trim() === '') {
      throw ApplicationError.invalidInput('La solicitud no es válida', [
        { field: CUSTOMER_HEADER, message: 'Falta el cliente' },
      ]);
    }
    const { payment, created } = await this.authorizePayment.execute({
      orderId: request.orderId,
      customerId: customerId.trim(),
      amount: money(request.amount.toFixed(2), request.currency),
    });
    response.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return toPaymentResponse(payment);
  }

  @Get(':id')
  @ApiEnvelope(PaymentResponse, { description: 'El pago pedido' })
  @ApiErrors(400, 404)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentResponse> {
    return toPaymentResponse(await this.getPayment.execute(id));
  }

  /** Reembolsa el pago; repetirlo devuelve el mismo pago. */
  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiEnvelope(PaymentResponse, { description: 'El pago reembolsado' })
  @ApiErrors(400, 404)
  async refund(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentResponse> {
    return toPaymentResponse(await this.refundPayment.execute(id));
  }
}
