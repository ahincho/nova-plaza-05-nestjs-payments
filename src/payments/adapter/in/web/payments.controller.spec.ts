import { ApplicationError } from '@ahincho/nova-nestjs';
import { money } from '../../../domain/money';
import type { Payment } from '../../../domain/payment';
import { PaymentsController, type StatusSetter } from './payments.controller';

const PAYMENT: Payment = {
  id: '0199a7e2-0000-7000-8000-000000000001',
  orderId: '0199a7e2-0000-7000-8000-000000000002',
  customerId: 'customer-1',
  amount: money('100.90', 'PEN'),
  status: 'AUTHORIZED',
  createdAt: new Date('2026-10-02T15:00:00.000Z'),
  updatedAt: new Date('2026-10-02T15:00:00.000Z'),
};

describe('PaymentsController', () => {
  const authorize = vi.fn();
  const get = vi.fn();
  const refund = vi.fn();
  // Los dobles satisfacen los puertos de entrada por su forma: el controlador
  // pide las interfaces, no las clases de los servicios.
  const controller = new PaymentsController(
    { execute: authorize },
    { execute: get },
    { execute: refund },
  );
  const response = () => {
    const status = vi.fn();
    return { status, res: { status } as StatusSetter };
  };

  beforeEach(() => vi.resetAllMocks());

  // Lo que se prueba acá es la traducción, que es todo lo que un adaptador de
  // entrada tiene derecho a hacer.
  it('traduce el cobro al caso de uso y el pago a la respuesta pública', async () => {
    authorize.mockResolvedValue({ payment: PAYMENT, created: true });
    const { status, res } = response();

    const body = await controller.authorize(
      ' customer-1 ',
      { orderId: PAYMENT.orderId, amount: 100.9, currency: 'PEN' },
      res,
    );

    expect(authorize).toHaveBeenCalledWith({
      orderId: PAYMENT.orderId,
      customerId: 'customer-1',
      amount: { cents: 10090, currency: 'PEN' },
    });
    expect(status).toHaveBeenCalledWith(201);
    expect(body).toEqual({
      id: PAYMENT.id,
      orderId: PAYMENT.orderId,
      status: 'AUTHORIZED',
      amount: 100.9,
      currency: 'PEN',
      createdAt: '2026-10-02T15:00:00.000Z',
      updatedAt: '2026-10-02T15:00:00.000Z',
    });
  });

  it('un cobro repetido responde 200 y no 201', async () => {
    authorize.mockResolvedValue({ payment: PAYMENT, created: false });
    const { status, res } = response();

    await controller.authorize(
      'customer-1',
      { orderId: PAYMENT.orderId, amount: 100.9, currency: 'PEN' },
      res,
    );

    expect(status).toHaveBeenCalledWith(200);
  });

  it.each([undefined, '  '])(
    'sin cliente es un 400 y no llega al caso de uso: %s',
    async (customer) => {
      await expect(
        controller.authorize(
          customer,
          { orderId: PAYMENT.orderId, amount: 1, currency: 'PEN' },
          response().res,
        ),
      ).rejects.toBeInstanceOf(ApplicationError);
      expect(authorize).not.toHaveBeenCalled();
    },
  );

  it('devuelve y reembolsa por id', async () => {
    get.mockResolvedValue(PAYMENT);
    refund.mockResolvedValue({ ...PAYMENT, status: 'REFUNDED' });

    await expect(controller.findOne(PAYMENT.id)).resolves.toMatchObject({
      id: PAYMENT.id,
    });
    await expect(controller.refund(PAYMENT.id)).resolves.toMatchObject({
      status: 'REFUNDED',
    });
  });

  // Un fallo del núcleo sube tal cual: convertirlo en una respuesta es trabajo
  // del filtro global de la plataforma, no de cada controlador.
  it('deja subir el error del caso de uso', async () => {
    get.mockRejectedValue(new Error('vaya'));

    await expect(controller.findOne(PAYMENT.id)).rejects.toThrow('vaya');
  });
});
