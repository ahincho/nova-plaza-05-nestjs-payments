import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import type { Mock } from 'vitest';

describe('PaymentsService', () => {
  function service(findById: Mock): PaymentsService {
    // El doble satisface el puerto por su forma, sin castear: el servicio pide
    // una interfaz y no una clase, que es la razón de que el puerto exista.
    return new PaymentsService({ findById });
  }

  it('devuelve lo que encuentra el puerto', async () => {
    const findById = vi.fn().mockResolvedValue({ id: '1' });

    await expect(service(findById).execute('1')).resolves.toEqual({ id: '1' });
    expect(findById).toHaveBeenCalledWith('1');
  });

  // Quien decide que «no existe» es un 404 es el servicio: el adaptador no
  // conoce códigos HTTP, sólo sabe si encontró algo.
  it('convierte un null del puerto en un 404', async () => {
    const findById = vi.fn().mockResolvedValue(null);

    await expect(service(findById).execute('1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
