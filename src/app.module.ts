import { Module } from '@nestjs/common';
import { NovaModule } from '@ahincho/nova-nestjs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { connect, databaseCheck, databaseOptions } from './database';
import { paymentsConfig } from './payments/payments.config';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    NovaModule.forRoot({
      config: { load: [paymentsConfig] },

      health: {
        // Tras SIGTERM el servicio sigue vivo esta ventana y termina lo que
        // tenga en vuelo; `ready` contesta 503 mientras tanto. Menor que el
        // stopTimeout de la tarea -30 s por defecto-, porque pasado ese plazo
        // llega un SIGKILL a mitad del drenaje.
        gracefulShutdownTimeoutMs: 5000,

        // Pagos no puede atender sin su base, así que `ready` la mira. `live`
        // no: si la base cae, reiniciar el contenedor no la levanta.
        readinessChecks: [databaseCheck],
      },
    }),
    TypeOrmModule.forRootAsync({
      useFactory: databaseOptions,
      dataSourceFactory: async (options) => {
        if (options === undefined) {
          throw new Error('TypeORM no recibió opciones');
        }
        return connect(options);
      },
    }),
    PaymentsModule,
  ],
})
export class AppModule {}
