import { setupOpenApi, validationExceptionFactory } from '@ahincho/nova-nestjs';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Pagos de punta a punta, contra un Postgres de verdad en un contenedor: las
 * migraciones, la restricción única por pedido y el sobre de Nova.
 *
 * El test no pasa por `bootstrap()`, así que monta lo que `bootstrap()` pone y
 * la prueba necesita: el `ValidationPipe` con la fábrica de errores de Nova y
 * la documentación. Las credenciales llegan como llegarían de Vault, en
 * `DB_URL`, `DB_USERNAME` y `DB_PASSWORD`.
 */
describe('PlazaPayments', () => {
  let database: StartedPostgreSqlContainer;
  let app: INestApplication;
  let http: App;

  beforeAll(async () => {
    database = await new PostgreSqlContainer('postgres:17-alpine').start();
    process.env['DB_URL'] =
      `postgres://${database.getHost()}:${database.getPort()}/${database.getDatabase()}`;
    process.env['DB_USERNAME'] = database.getUsername();
    process.env['DB_PASSWORD'] = database.getPassword();
    process.env['PAYMENTS_MAX_AMOUNT'] = '1000';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: validationExceptionFactory,
      }),
    );
    setupOpenApi(app, { title: 'PlazaPayments', bearerAuth: false });
    await app.init();
    http = app.getHttpServer() as App;
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    await database?.stop();
  });

  const charge = (orderId: string, amount: number, customer = 'customer-1') =>
    request(http)
      .post('/payments')
      .set('X-Customer-Id', customer)
      .send({ orderId, amount, currency: 'PEN' });

  // Vive y disponible no son lo mismo: `ready` mira la base, `live` no.
  it('answers both probes, with the database behind readiness', async () => {
    await request(http).get('/health/live').expect(200);
    const ready = await request(http).get('/health/ready').expect(200);

    expect(ready.body).toMatchObject({ status: 'ok' });
  });

  it('authorizes a payment once and repeats the same one', async () => {
    const orderId = '0199a7e2-1111-7000-8000-000000000001';

    const first = await charge(orderId, 100.9).expect(201);
    const again = await charge(orderId, 100.9).expect(200);

    expect(first.body).toMatchObject({
      success: true,
      data: {
        orderId,
        status: 'AUTHORIZED',
        amount: 100.9,
        currency: 'PEN',
      },
    });
    expect(again.body.data.id).toBe(first.body.data.id);

    await request(http)
      .get(`/payments/${first.body.data.id as string}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.data.amount).toBe(100.9);
      });
  });

  it('the same order for another amount is the 409 of the domain', async () => {
    const orderId = '0199a7e2-1111-7000-8000-000000000002';
    await charge(orderId, 50).expect(201);

    const conflict = await charge(orderId, 60).expect(409);

    expect(conflict.body).toMatchObject({
      success: false,
      errors: [{ code: 'PAYMENT_CONFLICT' }],
    });
  });

  it('two simultaneous charges of one order leave one payment', async () => {
    const orderId = '0199a7e2-1111-7000-8000-000000000003';

    const responses = await Promise.all([
      charge(orderId, 20),
      charge(orderId, 20),
      charge(orderId, 20),
    ]);

    const ids = new Set(responses.map((r) => r.body.data.id as string));
    expect(ids.size).toBe(1);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 200, 201]);
  });

  it('declines an amount over the limit with a 422', async () => {
    const declined = await charge(
      '0199a7e2-1111-7000-8000-000000000004',
      1000.01,
    ).expect(422);

    expect(declined.body.errors[0].code).toBe('PAYMENT_DECLINED');
  });

  it('refunds once and answers the same afterwards', async () => {
    const created = await charge(
      '0199a7e2-1111-7000-8000-000000000005',
      30,
    ).expect(201);
    const id = created.body.data.id as string;

    const refunded = await request(http)
      .post(`/payments/${id}/refund`)
      .expect(200);
    const again = await request(http)
      .post(`/payments/${id}/refund`)
      .expect(200);

    expect(refunded.body.data.status).toBe('REFUNDED');
    expect(again.body.data).toEqual(refunded.body.data);
  });

  it('an unknown payment is the 404 of the domain', async () => {
    const missing = await request(http)
      .get('/payments/0199a7e2-9999-7000-8000-000000000000')
      .expect(404);

    expect(missing.body.errors[0].code).toBe('PAYMENT_NOT_FOUND');
  });

  it('an invalid charge is a 400 with its fields', async () => {
    const invalid = await request(http)
      .post('/payments')
      .set('X-Customer-Id', 'customer-1')
      .send({ orderId: 'not-a-uuid', amount: -5, currency: 'soles' })
      .expect(400);

    const fields = (invalid.body.errors as { field: string }[]).map(
      (e) => e.field,
    );
    expect(fields).toEqual(
      expect.arrayContaining(['orderId', 'amount', 'currency']),
    );

    await charge('0199a7e2-1111-7000-8000-000000000006', 10, '').expect(400);
  });

  // Que el documento se sirva no alcanza: tiene que describir el sobre
  // envolviendo al DTO, que es lo que sale por el cable.
  it('serves an OpenAPI document with the envelope around the dto', async () => {
    const response = await request(http).get('/docs/json').expect(200);
    const document = response.body as {
      components: { schemas: Record<string, unknown> };
      paths: Record<string, unknown>;
    };

    expect(document.components.schemas).toHaveProperty('PaymentResponse');
    expect(JSON.stringify(document.paths)).toContain(
      '#/components/schemas/ApiEnvelopeSchema',
    );
  });
});
