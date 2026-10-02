import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Payments } from '../domain/payments';
import type { GetPaymentsUseCase } from '../port/in/get-payments.use-case';
import {
  FIND_PAYMENTS_PORT,
  type FindPaymentsPort,
} from '../port/out/find-payments.port';

@Injectable()
export class PaymentsService implements GetPaymentsUseCase {
  constructor(
    @Inject(FIND_PAYMENTS_PORT)
    private readonly findPayments: FindPaymentsPort,
  ) {}

  async execute(id: string): Promise<Payments> {
    const found = await this.findPayments.findById(id);

    // El puerto devuelve null cuando no existe, y es el servicio quien decide
    // que eso es un 404. El adaptador no conoce codigos HTTP.
    if (found === null) {
      throw new NotFoundException(`Payments ${id} no encontrado`);
    }

    return found;
  }
}
