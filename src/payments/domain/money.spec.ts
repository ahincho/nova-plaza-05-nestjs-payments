import { formatAmount, money, sameMoney } from './money';

describe('money', () => {
  it('lee un monto en centavos enteros, sin errores de punto flotante', () => {
    expect(money('100', 'PEN')).toEqual({ cents: 10000, currency: 'PEN' });
    expect(money('100.9', 'PEN')).toEqual({ cents: 10090, currency: 'PEN' });
    expect(money('0.30', 'PEN').cents).toBe(30);
  });

  it('escribe el monto con dos decimales, como lo guarda la base', () => {
    expect(formatAmount(money('100.9', 'PEN'))).toBe('100.90');
    expect(formatAmount(money('7.05', 'PEN'))).toBe('7.05');
    expect(formatAmount(money('1000', 'USD'))).toBe('1000.00');
  });

  it.each(['', '-1', '1.234', 'diez', '1e3'])(
    'rechaza lo que no es un monto: %s',
    (amount) => {
      expect(() => money(amount, 'PEN')).toThrow(RangeError);
    },
  );

  it('compara monto y moneda', () => {
    expect(sameMoney(money('10', 'PEN'), money('10.00', 'PEN'))).toBe(true);
    expect(sameMoney(money('10', 'PEN'), money('10', 'USD'))).toBe(false);
    expect(sameMoney(money('10', 'PEN'), money('10.01', 'PEN'))).toBe(false);
  });
});
