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

describe('localToday y resolveRelativePeriod', () => {
  const { localToday, resolveRelativePeriod, PERIOD_EXPRESSIONS } = require('../../src/domain');

  it('la fecha de hoy depende de la zona del comercio', () => {
    // 03:00Z del 30: en Bogota todavia es el 29.
    expect(localToday('2026-10-30T03:00:00.000Z', 'America/Bogota')).toBe('2026-10-29');
    expect(localToday('2026-10-30T03:00:00.000Z', 'Europe/Madrid')).toBe('2026-10-30');
  });

  // Jueves 29 de octubre de 2026. La semana empieza el lunes.
  const today = '2026-10-29';
  it.each([
    ['hoy', '2026-10-29', '2026-10-30'],
    ['ayer', '2026-10-28', '2026-10-29'],
    ['esta_semana', '2026-10-26', '2026-10-30'],
    ['semana_pasada', '2026-10-19', '2026-10-26'],
    ['este_mes', '2026-10-01', '2026-10-30'],
    ['mes_pasado', '2026-09-01', '2026-10-01'],
    ['ultimos_7_dias', '2026-10-23', '2026-10-30'],
  ])('%s -> [%s, %s)', (expression, from, to) => {
    expect(resolveRelativePeriod({ expression, today })).toEqual({ from, to });
  });

  it('semana_pasada desde un lunes y mes_pasado en enero', () => {
    expect(resolveRelativePeriod({ expression: 'semana_pasada', today: '2026-10-26' })).toEqual({
      from: '2026-10-19',
      to: '2026-10-26',
    });
    expect(resolveRelativePeriod({ expression: 'mes_pasado', today: '2026-01-10' })).toEqual({
      from: '2025-12-01',
      to: '2026-01-01',
    });
  });

  it('rango con fechas inclusivas se convierte en [inicio, fin + 1)', () => {
    expect(
      resolveRelativePeriod({
        expression: 'rango',
        today,
        startDate: '2026-01-15',
        endDate: '2026-01-15',
      }),
    ).toEqual({ from: '2026-01-15', to: '2026-01-16' });
  });

  it('rechaza expresiones desconocidas y rangos invertidos', () => {
    expect(PERIOD_EXPRESSIONS).toContain('semana_pasada');
    expect(code(() => resolveRelativePeriod({ expression: 'el_otro_martes', today }))).toBe(
      'INVALID_PERIOD',
    );
    expect(
      code(() =>
        resolveRelativePeriod({
          expression: 'rango',
          today,
          startDate: '2026-01-16',
          endDate: '2026-01-15',
        }),
      ),
    ).toBe('INVALID_PERIOD');
  });
});

describe('periodos relativos: bordes', () => {
  const { localToday, resolveRelativePeriod } = require('../../src/domain');
  const r = (expression, today) => resolveRelativePeriod({ expression, today });

  it('domingo, cruce de año, cruce de mes, dia 1 y 29 de febrero', () => {
    expect(r('esta_semana', '2026-11-01')).toEqual({ from: '2026-10-26', to: '2026-11-02' });
    expect(r('semana_pasada', '2027-01-04')).toEqual({ from: '2026-12-28', to: '2027-01-04' });
    expect(r('esta_semana', '2026-12-02')).toEqual({ from: '2026-11-30', to: '2026-12-03' });
    expect(r('este_mes', '2026-10-01')).toEqual({ from: '2026-10-01', to: '2026-10-02' });
    expect(r('ayer', '2028-03-01')).toEqual({ from: '2028-02-29', to: '2028-03-01' });
  });

  it('localToday en zonas por delante de UTC cerca de la medianoche', () => {
    expect(localToday('2026-10-29T15:30:00.000Z', 'Asia/Tokyo')).toBe('2026-10-30');
    expect(localToday('2026-10-29T09:59:59.000Z', 'Pacific/Kiritimati')).toBe('2026-10-29');
    expect(localToday('2026-10-29T10:00:00.000Z', 'Pacific/Kiritimati')).toBe('2026-10-30');
  });
});
