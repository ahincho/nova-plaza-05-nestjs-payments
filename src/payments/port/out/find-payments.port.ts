import type { Payments } from '../../domain/payments';

/**
 * Lo que este feature necesita de afuera, dicho en terminos del dominio.
 *
 * El puerto habla de Payments, no de la respuesta del upstream:
 * el adaptador es quien traduce, y por eso un cambio alla no llega hasta aca.
 */
export interface FindPaymentsPort {
  findById(id: string): Promise<Payments | null>;
}

export const FIND_PAYMENTS_PORT = Symbol('FIND_PAYMENTS_PORT');
