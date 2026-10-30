'use strict';

const { localHour, isNight, RULES, DomainError } = require('../../src/domain');

const BOGOTA = 'America/Bogota'; // UTC-5, sin horario de verano
const rules = RULES.v1;

describe('localHour', () => {
  it('convierte un instante UTC a la hora local del comercio', () => {
    expect(localHour('2026-01-16T01:00:00Z', BOGOTA)).toBe(20);
    expect(localHour('2026-01-16T01:00:00Z', 'America/Mexico_City')).toBe(19);
  });

  it('rechaza una zona horaria invalida', () => {
    expect(() => localHour('2026-01-16T01:00:00Z', 'Marte/Olympus')).toThrow(DomainError);
  });

  it('rechaza fechas sin Z o invalidas', () => {
    expect(() => localHour('2026-01-16T01:00:00', BOGOTA)).toThrow(DomainError);
    expect(() => localHour('2026-01-16T01:00:00-05:00', BOGOTA)).toThrow(DomainError);
    expect(() => localHour('no-es-fecha', BOGOTA)).toThrow(DomainError);
  });
});

describe('isNight: horario nocturno [20:00, 06:00) hora local', () => {
  it('19:59:59 local es dia', () => {
    expect(isNight('2026-01-16T00:59:59Z', BOGOTA, rules)).toBe(false);
  });

  it('20:00:00 local exacto es noche', () => {
    expect(isNight('2026-01-16T01:00:00Z', BOGOTA, rules)).toBe(true);
  });

  it('05:59:59 local es noche', () => {
    expect(isNight('2026-01-16T10:59:59Z', BOGOTA, rules)).toBe(true);
  });

  it('06:00:00 local exacto es dia', () => {
    expect(isNight('2026-01-16T11:00:00Z', BOGOTA, rules)).toBe(false);
  });

  it('medianoche local es noche', () => {
    expect(isNight('2026-01-16T05:00:00Z', BOGOTA, rules)).toBe(true);
  });
});
