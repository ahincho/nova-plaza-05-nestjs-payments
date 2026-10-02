import { PaymentsInMemoryAdapter } from './payments.inmemory.adapter';

describe('PaymentsInMemoryAdapter', () => {
  // Se prueba aunque sea un marcador de posición, porque el contrato que tiene
  // que cumplir su reemplazo es exactamente este: devolver null cuando no hay
  // nada, y nunca lanzar por eso.
  it('no encuentra nada, y lo dice con null', async () => {
    await expect(
      new PaymentsInMemoryAdapter().findById('1'),
    ).resolves.toBeNull();
  });
});
