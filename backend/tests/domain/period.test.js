'use strict';

const { localDateRangeToUtc, DomainError } = require('../../src/domain');

function code(fn) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(DomainError);
    return err.code;
  }
  throw new Error('se esperaba un DomainError');
}

describe('localDateRangeToUtc: rango [desde, hasta) en fechas locales del comercio', () => {
  it('Bogota (UTC-5): la medianoche local son las 05:00Z', () => {
    expect(localDateRangeToUtc('2026-01-15', '2026-01-16', 'America/Bogota')).toEqual({
      fromUtc: '2026-01-15T05:00:00.000Z',
      toUtc: '2026-01-16T05:00:00.000Z',
    });
  });

  it('Ciudad de Mexico (UTC-6)', () => {
    expect(localDateRangeToUtc('2026-01-15', '2026-01-16', 'America/Mexico_City').fromUtc).toBe(
      '2026-01-15T06:00:00.000Z',
    );
  });

  it('Santiago en horario de verano (UTC-3)', () => {
    expect(localDateRangeToUtc('2026-10-20', '2026-10-21', 'America/Santiago').fromUtc).toBe(
      '2026-10-20T03:00:00.000Z',
    );
  });

  it('Santiago: el 6 de septiembre la medianoche no existe y el dia empieza a la 01:00', () => {
    // 00:00 -04 salta a 01:00 -03 (04:00Z). El dia anterior termina ahi mismo.
    expect(localDateRangeToUtc('2026-09-06', '2026-09-07', 'America/Santiago').fromUtc).toBe(
      '2026-09-06T04:00:00.000Z',
    );
    expect(localDateRangeToUtc('2026-09-05', '2026-09-06', 'America/Santiago').toUtc).toBe(
      '2026-09-06T04:00:00.000Z',
    );
  });

  it('Santiago: al volver al horario de invierno el dia empieza en su unica medianoche', () => {
    // 2026-04-05: a las 00:00 -03 (03:00Z) el reloj vuelve a las 23:00 del 4.
    expect(localDateRangeToUtc('2026-04-05', '2026-04-06', 'America/Santiago').fromUtc).toBe(
      '2026-04-05T04:00:00.000Z',
    );
  });

  it('Nueva York al atrasar la hora en noviembre', () => {
    expect(localDateRangeToUtc('2026-11-01', '2026-11-02', 'America/New_York')).toEqual({
      fromUtc: '2026-11-01T04:00:00.000Z',
      toUtc: '2026-11-02T05:00:00.000Z',
    });
  });

  it('Nueva York cruzando el cambio de horario', () => {
    // 8 de marzo de 2026: a las 02:00 pasa de EST (UTC-5) a EDT (UTC-4).
    expect(localDateRangeToUtc('2026-03-08', '2026-03-09', 'America/New_York')).toEqual({
      fromUtc: '2026-03-08T05:00:00.000Z',
      toUtc: '2026-03-09T04:00:00.000Z',
    });
  });

  it('rechaza formatos invalidos, fechas imposibles y rangos vacios o enormes', () => {
    expect(code(() => localDateRangeToUtc('15/01/2026', '2026-01-16', 'America/Bogota'))).toBe(
      'INVALID_PERIOD',
    );
    expect(code(() => localDateRangeToUtc('2026-02-30', '2026-03-01', 'America/Bogota'))).toBe(
      'INVALID_PERIOD',
    );
    expect(code(() => localDateRangeToUtc('2026-01-16', '2026-01-16', 'America/Bogota'))).toBe(
      'INVALID_PERIOD',
    );
    expect(code(() => localDateRangeToUtc('2024-01-01', '2026-01-01', 'America/Bogota'))).toBe(
      'INVALID_PERIOD',
    );
    expect(code(() => localDateRangeToUtc('2026-01-15', '2026-01-16', 'Marte/Olympus'))).toBe(
      'INVALID_TIMEZONE',
    );
  });
});
