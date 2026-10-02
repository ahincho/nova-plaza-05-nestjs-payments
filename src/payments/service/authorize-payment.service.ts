import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { formatAmount, money, type Money } from '../domain/money';
import { authorized, chargesTheSame, type Payment } from '../domain/payment';
import { PaymentErrors } from '../exception/payment-errors';
import type {
  AuthorizePayment,
  AuthorizePaymentUseCase,
  Authorization,
} from '../port/in/authorize-payment.use-case';
import {
  PAYMENT_STORE_PORT,
  type PaymentStorePort,
} from '../port/out/payment-store.port';
import { PAYMENT_SETTINGS, type PaymentSettings } from './payment-settings';

/**
 * Autoriza el pago de un pedido (ADR-056).
 *
 * **Un pedido tiene un solo pago.** Repetir el mismo cobro devuelve el pago que
 * ya existe; cobrar el mismo pedido por otro monto es un 409. Si dos cobros
 * llegan a la vez, la restricción única de la base deja pasar uno, y el otro
 * vuelve a leer y responde como una repetición.
 */
@Injectable()
export class AuthorizePaymentService implements AuthorizePaymentUseCase {
  constructor(
    @Inject(PAYMENT_STORE_PORT)
    private readonly payments: PaymentStorePort,
    @Inject(PAYMENT_SETTINGS)
    private readonly settings: PaymentSettings,
  ) {}

  async execute(command: AuthorizePayment): Promise<Authorization> {
    const limit = money(this.settings.maxAmount, command.amount.currency);
    if (command.amount.cents > limit.cents) {
      throw PaymentErrors.declined(
        formatAmount(command.amount),
        command.amount.currency,
        formatAmount(limit),
      );
    }

    const existing = await this.payments.findByOrderId(command.orderId);
    if (existing !== null) {
      return repeated(existing, command.amount);
    }

    const payment = authorized({
      id: randomUUID(),
      orderId: command.orderId,
      customerId: command.customerId,
      amount: command.amount,
      now: this.settings.now(),
    });
    if (await this.payments.insert(payment)) {
      return { payment, created: true };
    }

    // Otro cobro del mismo pedido llegó primero: el pago es el suyo.
    const winner = await this.payments.findByOrderId(command.orderId);
    if (winner === null) {
      throw new Error(`el pago del pedido ${command.orderId} desapareció`);
    }
    return repeated(winner, command.amount);
  }
}

function repeated(existing: Payment, amount: Money): Authorization {
  if (!chargesTheSame(existing, amount)) {
    throw PaymentErrors.conflict(existing.orderId);
  }
  return { payment: existing, created: false };
}
