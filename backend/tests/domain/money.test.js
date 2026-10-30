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

  it('rechaza argumentos que no son BigInt, negativos o denominador cero', () => {
    expect(() => roundHalfUp(25, 10)).toThrow(DomainError);
    expect(() => roundHalfUp(-25n, 10n)).toThrow(DomainError);
    expect(() => roundHalfUp(25n, 0n)).toThrow(DomainError);
  });
});
