'use strict';

const { DomainError } = require('./errors');

// Division entera con redondeo half-up. Es el unico punto donde se redondea
// dinero; los calculos llegan aqui como fraccion exacta en BigInt.
function roundHalfUp(numerator, denominator) {
  if (typeof numerator !== 'bigint' || typeof denominator !== 'bigint') {
    throw new DomainError('INVALID_ARGUMENT', 'roundHalfUp requiere BigInt');
  }
  if (numerator < 0n || denominator <= 0n) {
    throw new DomainError('INVALID_ARGUMENT', 'roundHalfUp requiere valores no negativos');
  }

  let quotient = numerator / denominator;
  if ((numerator % denominator) * 2n >= denominator) quotient += 1n;

  if (quotient > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new DomainError('INVALID_ARGUMENT', 'Monto fuera de rango');
  }
  return Number(quotient);
}

module.exports = { roundHalfUp };
