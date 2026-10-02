import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ApiEnvelope, ApiErrors } from '@ahincho/nova-nestjs';
import {
  GET_PAYMENTS_USE_CASE,
  type GetPaymentsUseCase,
} from '../../../port/in/get-payments.use-case';
import {
  toPaymentsResponse,
  PaymentsResponse,
} from './response/payments.response';

@Controller('payments')
export class PaymentsController {
  /**
   * Depende del puerto de entrada y no de la clase del servicio. El controlador
   * es un adaptador: si nombra la implementación, el núcleo deja de poder
   * cambiar sin que cambie el borde.
   */
  constructor(
    @Inject(GET_PAYMENTS_USE_CASE)
    private readonly payments: GetPaymentsUseCase,
  ) {}

  /**
   * Devuelve la respuesta pelada: el sobre lo pone el interceptor global de la
   * plataforma, y ningún controlador lo arma a mano.
   *
   * `ApiEnvelope` es lo que hace que el documento diga la verdad. El
   * interceptor envuelve **después** de que este método devolvió, así que un
   * documento generado del tipo de retorno describiría el método y no el cable.
   */
  @Get(':id')
  @ApiEnvelope(PaymentsResponse, { description: 'El payments pedido' })
  @ApiErrors(404)
  async findOne(@Param('id') id: string): Promise<PaymentsResponse> {
    return toPaymentsResponse(await this.payments.execute(id));
  }
}
