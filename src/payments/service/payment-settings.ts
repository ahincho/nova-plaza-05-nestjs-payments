/** Lo que los casos de uso necesitan saber de afuera, sin leer el entorno. */
export type PaymentSettings = {
  /** El monto más alto que se autoriza, como `1000` o `1000.50`. */
  readonly maxAmount: string;
  /** El reloj; una prueba lo fija. */
  readonly now: () => Date;
};

export const PAYMENT_SETTINGS = Symbol('PAYMENT_SETTINGS');
