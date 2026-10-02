import type { Payments } from '../../domain/payments';

/**
 * Lo que este feature sabe hacer, dicho sin mencionar como.
 */
export interface GetPaymentsUseCase {
  execute(id: string): Promise<Payments>;
}

export const GET_PAYMENTS_USE_CASE = Symbol('GET_PAYMENTS_USE_CASE');
