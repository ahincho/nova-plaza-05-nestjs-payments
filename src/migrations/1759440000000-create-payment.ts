import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La tabla de pagos. La restricción única de `order_id` es la que garantiza un
 * solo pago por pedido aunque dos cobros lleguen a la vez.
 */
export class CreatePayment1759440000000 implements MigrationInterface {
  name = 'CreatePayment1759440000000';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      create table payment (
        id          uuid primary key,
        order_id    uuid           not null,
        customer_id varchar(64)    not null,
        amount      numeric(12, 2) not null check (amount > 0),
        currency    varchar(3)     not null,
        status      varchar(16)    not null,
        created_at  timestamp with time zone not null,
        updated_at  timestamp with time zone not null,
        version     integer        not null,
        constraint payment_order_id unique (order_id)
      )
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('drop table payment');
  }
}
