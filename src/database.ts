import type { ReadinessCheck } from '@ahincho/nova-nestjs';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { CreatePayment1759440000000 } from './migrations/1759440000000-create-payment';
import { PaymentEntity } from './payments/adapter/out/persistence/payment.entity';

/**
 * La conexión a Postgres del servicio (ADR-056). Es el primer servicio NestJS de
 * Nova con base, así que esto vive aquí y no en la plataforma, como dice
 * ADR-020.
 */
let current: DataSource | undefined;

/**
 * Las opciones se leen al crear el módulo y no al importar este archivo: las
 * credenciales llegan de Vault en `bootstrap()`, antes de que exista la
 * aplicación pero después de que se importó `app.module`.
 */
export function databaseOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    url: required('DB_URL'),
    username: required('DB_USERNAME'),
    password: required('DB_PASSWORD'),
    entities: [PaymentEntity],
    migrations: [CreatePayment1759440000000],
    // El esquema lo dicen las migraciones, y el servicio las corre al arrancar,
    // como Flyway en Java. `synchronize` cambiaría la base desde las entidades.
    migrationsRun: true,
    synchronize: false,
  };
}

/** Crea la conexión y la recuerda para la sonda de disponibilidad. */
export async function connect(options: DataSourceOptions): Promise<DataSource> {
  current = await new DataSource(options).initialize();
  return current;
}

/**
 * El servicio está listo si la base contesta. Un `select 1` que falla tira la
 * sonda, que para Nova es lo mismo que devolver `false`.
 */
export const databaseCheck: ReadinessCheck = {
  name: 'database',
  async check(): Promise<boolean> {
    if (current === undefined || !current.isInitialized) {
      return false;
    }
    await current.query('select 1');
    return true;
  },
};

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Falta ${name}: el secreto plaza/payments/db de Vault la trae, o se define a mano`,
    );
  }
  return value;
}
