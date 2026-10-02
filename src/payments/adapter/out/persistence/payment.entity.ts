import { Column, Entity, PrimaryColumn, VersionColumn } from 'typeorm';

/**
 * La fila de un pago. El dominio no la ve: el adaptador la convierte en
 * `Payment`. El esquema lo dicen las migraciones de `src/migrations`, no esta
 * clase: `synchronize` está apagado.
 */
@Entity('payment')
export class PaymentEntity {
  @PrimaryColumn('uuid')
  id!: string;

  // Única: un pedido tiene un solo pago, y es la base quien lo garantiza.
  @Column({ name: 'order_id', type: 'uuid', unique: true })
  orderId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 64 })
  customerId!: string;

  // `pg` devuelve un numeric como texto, que es justo lo que evita perder
  // centavos en un número de punto flotante.
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ type: 'varchar', length: 16 })
  status!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @VersionColumn()
  version!: number;
}
