import { DomainError } from '@ahincho/nova-nestjs';
import { money } from '../domain/money';
import type { Payment } from '../domain/payment';
import type { PaymentStorePort } from '../port/out/payment-store.port';
import { AuthorizePaymentService } from './authorize-payment.service';
import { GetPaymentService } from './get-payment.service';
import type { PaymentSettings } from './payment-settings';
import { RefundPaymentService } from './refund-payment.service';

/**
 * El puerto de salida en memoria: los casos de uso se prueban sin base, que es
 * lo que promete el hexágono.
 */
class InMemoryPaymentStore implements PaymentStorePort {
  readonly rows = new Map<string, Payment>();
  /** Simula otro cobro del mismo pedido que llega justo antes del insert. */
  raceWith: Payment | undefined;

  findById(id: string): Promise<Payment | null> {
    return Promise.resolve(this.rows.get(id) ?? null);
  }

  findByOrderId(orderId: string): Promise<Payment | null> {
    const found = [...this.rows.values()].find((p) => p.orderId === orderId);
    return Promise.resolve(found ?? null);
  }

  insert(payment: Payment): Promise<boolean> {
    if (this.raceWith !== undefined) {
      this.rows.set(this.raceWith.id, this.raceWith);
      this.raceWith = undefined;
    }
    const taken = [...this.rows.values()].some(
      (p) => p.orderId === payment.orderId,
    );
    if (!taken) {
      this.rows.set(payment.id, payment);
    }
    return Promise.resolve(!taken);
  }

  update(payment: Payment): Promise<void> {
    this.rows.set(payment.id, payment);
    return Promise.resolve();
  }
}

const ORDER = '0199a7e2-1c3b-7d4e-8f00-123456789abc';
const NOW = new Date('2026-10-02T15:00:00.000Z');

describe('los casos de uso de pagos', () => {
  let store: InMemoryPaymentStore;
  let authorize: AuthorizePaymentService;
  let get: GetPaymentService;
  let refund: RefundPaymentService;
  let now: Date;

  beforeEach(() => {
    store = new InMemoryPaymentStore();
    now = NOW;
    const settings: PaymentSettings = { maxAmount: '1000', now: () => now };
    authorize = new AuthorizePaymentService(store, settings);
    get = new GetPaymentService(store);
    refund = new RefundPaymentService(store, settings);
  });

  const command = (amount = '100.90', currency = 'PEN') => ({
    orderId: ORDER,
    customerId: 'customer-1',
    amount: money(amount, currency),
  });

  it('autoriza un pago nuevo', async () => {
    const { payment, created } = await authorize.execute(command());

    expect(created).toBe(true);
    expect(payment).toMatchObject({
      orderId: ORDER,
      customerId: 'customer-1',
      status: 'AUTHORIZED',
      amount: { cents: 10090, currency: 'PEN' },
      createdAt: NOW,
    });
    expect(store.rows.size).toBe(1);
  });

  it('repetir el mismo cobro devuelve el mismo pago, sin otro', async () => {
    const first = await authorize.execute(command());
    const again = await authorize.execute(command('100.9'));

    expect(again).toEqual({ payment: first.payment, created: false });
    expect(store.rows.size).toBe(1);
  });

  it('el mismo pedido por otro monto es un conflicto', async () => {
    await authorize.execute(command());

    const conflict = authorize.execute(command('50'));

    await expect(conflict).rejects.toBeInstanceOf(DomainError);
    await expect(conflict).rejects.toMatchObject({ code: 'PAYMENT_CONFLICT' });
  });

  it('un monto sobre el tope se rechaza y no se guarda', async () => {
    await expect(authorize.execute(command('1000.01'))).rejects.toMatchObject({
      code: 'PAYMENT_DECLINED',
    });
    expect(store.rows.size).toBe(0);
    await expect(authorize.execute(command('1000'))).resolves.toMatchObject({
      created: true,
    });
  });

  it('si otro cobro del mismo pedido gana la carrera, responde el suyo', async () => {
    const winner: Payment = {
      id: 'winner',
      orderId: ORDER,
      customerId: 'customer-1',
      amount: money('100.90', 'PEN'),
      status: 'AUTHORIZED',
      createdAt: NOW,
      updatedAt: NOW,
    };
    store.raceWith = winner;

    await expect(authorize.execute(command())).resolves.toEqual({
      payment: winner,
      created: false,
    });
  });

  it('devuelve un pago, o el 404 de dominio', async () => {
    const { payment } = await authorize.execute(command());

    await expect(get.execute(payment.id)).resolves.toEqual(payment);
    await expect(get.execute('missing')).rejects.toMatchObject({
      code: 'PAYMENT_NOT_FOUND',
    });
  });

  it('reembolsa una vez, y repetirlo devuelve el mismo pago', async () => {
    const { payment } = await authorize.execute(command());
    now = new Date('2026-10-02T15:05:00.000Z');

    const done = await refund.execute(payment.id);
    now = new Date('2026-10-02T15:10:00.000Z');
    const again = await refund.execute(payment.id);

    expect(done.status).toBe('REFUNDED');
    expect(done.updatedAt).toEqual(new Date('2026-10-02T15:05:00.000Z'));
    expect(again).toEqual(done);
    await expect(refund.execute('missing')).rejects.toMatchObject({
      code: 'PAYMENT_NOT_FOUND',
    });
  });
});
