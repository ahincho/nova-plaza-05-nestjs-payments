import { Injectable } from '@nestjs/common';
import type { Payments } from '../../../domain/payments';
import type { FindPaymentsPort } from '../../../port/out/find-payments.port';

/**
 * El adaptador de salida con el que nace el feature, para que arranque.
 *
 * **Está para reemplazarse**, y el reemplazo es un cliente REST en
 * `adapter/out/restclient/` que hable con el sistema externo. Lo que no cambia
 * al reemplazarlo es nada más: el servicio depende de `FindPaymentsPort`,
 * no de esta clase, así que el cambio se queda dentro de esta carpeta.
 *
 * Existe porque un feature que no puede arrancar es peor que uno vacío. Sin
 * algo atado a `FIND_PAYMENTS_PORT`, Nest corta al
 * levantar con «can't resolve dependencies», y el primer contacto con el
 * generador es un error.
 */
@Injectable()
export class PaymentsInMemoryAdapter implements FindPaymentsPort {
  /**
   * Devuelve null a propósito: el servicio lo traduce a un 404, así que el
   * recorrido completo -controlador, servicio, puerto, adaptador, sobre de
   * error- queda ejercitado desde el primer día.
   */
  findById(_id: string): Promise<Payments | null> {
    return Promise.resolve(null);
  }
}
