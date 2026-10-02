import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, type Repository } from 'typeorm';
import { formatAmount, money } from '../../../domain/money';
import type { Payment, PaymentStatus } from '../../../domain/payment';
import type { PaymentStorePort } from '../../../port/out/payment-store.port';
import { PaymentEntity } from './payment.entity';

/** El código de Postgres para una restricción única que no se cumple. */
const UNIQUE_VIOLATION = '23505';

/** Los pagos sobre Postgres, con TypeORM (ADR-056). */
@Injectable()
export class TypeOrmPaymentStore implements PaymentStorePort {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly rows: Repository<PaymentEntity>,
  ) {}

  async findById(id: string): Promise<Payment | null> {
    const row = await this.rows.findOneBy({ id });
    return row === null ? null : toDomain(row);
  }

  async findByOrderId(orderId: string): Promise<Payment | null> {
    const row = await this.rows.findOneBy({ orderId });
    return row === null ? null : toDomain(row);
  }

  async insert(payment: Payment): Promise<boolean> {
    try {
      await this.rows.insert(toRow(payment));
      return true;
    } catch (error) {
      if (isUniqueViolation(error)) {
        return false;
      }
      throw error;
    }
  }

  async update(payment: Payment): Promise<void> {
    await this.rows.update(
      { id: payment.id },
      { status: payment.status, updatedAt: payment.updatedAt },
    );
  }
}

function toDomain(row: PaymentEntity): Payment {
  return {
    id: row.id,
    orderId: row.orderId,
    customerId: row.customerId,
    amount: money(row.amount, row.currency),
    status: row.status as PaymentStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toRow(payment: Payment): Omit<PaymentEntity, 'version'> {
  return {
    id: payment.id,
    orderId: payment.orderId,
    customerId: payment.customerId,
    amount: formatAmount(payment.amount),
    currency: payment.amount.currency,
    status: payment.status,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError as { code?: unknown } | undefined;
  return driverError?.code === UNIQUE_VIOLATION;
}
