'use strict';

const { roundHalfUp, DomainError } = require('../../src/domain');

describe('roundHalfUp', () => {
  it('redondea hacia arriba desde la mitad', () => {
    expect(roundHalfUp(25n, 10n)).toBe(3);
    expect(roundHalfUp(35n, 10n)).toBe(4);
  });

  it('redondea hacia abajo por debajo de la mitad', () => {
    expect(roundHalfUp(24n, 10n)).toBe(2);
  });

  it('no altera una division exacta', () => {
    expect(roundHalfUp(63_344_000n, 10_000n)).toBe(6334);
    expect(roundHalfUp(0n, 7n)).toBe(0);
  });

  it('devuelve un number entero', () => {
    expect(Number.isInteger(roundHalfUp(72_845_600_000n, 10_000_000n))).toBe(true);
  });

  it('el empate exacto sube siempre, tambien cuando el entero de abajo es par', () => {
    // 0,5 -> 1 | 1,5 -> 2 | 2,5 -> 3 (el redondeo al par daria 0, 2 y 2)
    expect(roundHalfUp(1n, 2n)).toBe(1);
    expect(roundHalfUp(3n, 2n)).toBe(2);
    expect(roundHalfUp(5n, 2n)).toBe(3);
  });

  it('justo por debajo y por encima del empate', () => {
    // 2000,4 -> 2000 | 2000,8 -> 2001 | 2001,2 -> 2001 (base 5001, 5002 y 5003 al 40 %)
    expect(roundHalfUp(5001n * 4000n, 10_000n)).toBe(2000);
    expect(roundHalfUp(5002n * 4000n, 10_000n)).toBe(2001);
    expect(roundHalfUp(5003n * 4000n, 10_000n)).toBe(2001);
    // 0,4 -> 0 y 0,6 -> 1
    expect(roundHalfUp(2n, 5n)).toBe(0);
    expect(roundHalfUp(3n, 5n)).toBe(1);
  });

  it('acepta el mayor entero seguro y rechaza lo que lo excede', () => {
    const max = BigInt(Number.MAX_SAFE_INTEGER);

    expect(roundHalfUp(max, 1n)).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => roundHalfUp(max + 1n, 1n)).toThrow(DomainError);
    // El redondeo hacia arriba tambien cuenta: (max + 0,5) sube a max + 1.
    expect(() => roundHalfUp(max * 2n + 1n, 2n)).toThrow(DomainError);
  });

  it('rechaza argumentos que no son BigInt, negativos o denominador cero', () => {
    expect(() => roundHalfUp(25, 10)).toThrow(DomainError);
    expect(() => roundHalfUp(-25n, 10n)).toThrow(DomainError);
    expect(() => roundHalfUp(25n, 0n)).toThrow(DomainError);
  });
});
