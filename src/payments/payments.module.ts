import { Module } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './adapter/in/web/payments.controller';
import { PaymentEntity } from './adapter/out/persistence/payment.entity';
import { TypeOrmPaymentStore } from './adapter/out/persistence/typeorm-payment-store.adapter';
import { paymentsConfig } from './payments.config';
import { AUTHORIZE_PAYMENT_USE_CASE } from './port/in/authorize-payment.use-case';
import { GET_PAYMENT_USE_CASE } from './port/in/get-payment.use-case';
import { REFUND_PAYMENT_USE_CASE } from './port/in/refund-payment.use-case';
import { PAYMENT_STORE_PORT } from './port/out/payment-store.port';
import { AuthorizePaymentService } from './service/authorize-payment.service';
import { GetPaymentService } from './service/get-payment.service';
import {
  PAYMENT_SETTINGS,
  type PaymentSettings,
} from './service/payment-settings';
import { RefundPaymentService } from './service/refund-payment.service';

/**
 * Las puntas se atan por token y no por clase, que es lo que hace que el núcleo
 * no conozca a ninguno de los bordes.
 */
@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity])],
  controllers: [PaymentsController],
  providers: [
    { provide: AUTHORIZE_PAYMENT_USE_CASE, useClass: AuthorizePaymentService },
    { provide: GET_PAYMENT_USE_CASE, useClass: GetPaymentService },
    { provide: REFUND_PAYMENT_USE_CASE, useClass: RefundPaymentService },
    { provide: PAYMENT_STORE_PORT, useClass: TypeOrmPaymentStore },
    {
      provide: PAYMENT_SETTINGS,
      inject: [paymentsConfig.KEY],
      useFactory: (
        config: ConfigType<typeof paymentsConfig>,
      ): PaymentSettings => ({
        maxAmount: config.maxAmount,
        now: () => new Date(),
      }),
    },
  ],
})
export class PaymentsModule {}
