import { Module } from '@nestjs/common';
import { PaymentsInMemoryAdapter } from './adapter/out/inmemory/payments.inmemory.adapter';
import { PaymentsController } from './adapter/in/web/payments.controller';
import { GET_PAYMENTS_USE_CASE } from './port/in/get-payments.use-case';
import { FIND_PAYMENTS_PORT } from './port/out/find-payments.port';
import { PaymentsService } from './service/payments.service';

/**
 * Las dos puntas se atan por token y no por clase, que es lo que hace que el
 * núcleo no conozca a ninguno de los dos bordes.
 */
@Module({
  controllers: [PaymentsController],
  providers: [
    { provide: GET_PAYMENTS_USE_CASE, useClass: PaymentsService },
    // Reemplazar por el cliente REST de `adapter/out/restclient/` cuando exista.
    // El servicio no se entera: depende del puerto, no de esta clase.
    {
      provide: FIND_PAYMENTS_PORT,
      useClass: PaymentsInMemoryAdapter,
    },
  ],
})
export class PaymentsModule {}
