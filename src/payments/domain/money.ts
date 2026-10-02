/**
 * Un monto en una moneda, en centavos enteros: nunca un `number` con decimales,
 * que suma 0.1 + 0.2 y da 0.30000000000000004.
 */
export type Money = {
  readonly cents: number;
  readonly currency: string;
};

const AMOUNT = /^(\d{1,10})(?:\.(\d{1,2}))?$/;

/**
 * Lee un monto como lo escribe una persona o una base: `100`, `100.9` o
 * `100.90`, con hasta dos decimales.
 *
 * @throws RangeError si no es un monto positivo con hasta dos decimales.
 */
export function money(amount: string, currency: string): Money {
  const match = AMOUNT.exec(amount);
  if (match === null) {
    throw new RangeError(`no es un monto: ${amount}`);
  }
  const units = Number(match[1]);
  const decimals = (match[2] ?? '').padEnd(2, '0');
  return { cents: units * 100 + Number(decimals), currency };
}

/** El monto con dos decimales, como lo guarda la base: `100.90`. */
export function formatAmount(value: Money): string {
  const units = Math.trunc(value.cents / 100);
  const decimals = String(value.cents % 100).padStart(2, '0');
  return `${units}.${decimals}`;
}

/** Si dos montos son el mismo, en la misma moneda. */
export function sameMoney(left: Money, right: Money): boolean {
  return left.cents === right.cents && left.currency === right.currency;
}
