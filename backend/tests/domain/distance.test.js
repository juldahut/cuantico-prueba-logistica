'use strict';

const { haversineMeters, RULES, DomainError } = require('../../src/domain');

const R = RULES.v1.earthRadiusM;

describe('haversineMeters', () => {
  it('0.01 grados de latitud sobre el mismo meridiano son 1112 m', () => {
    expect(haversineMeters({ lat: 4.6, lon: -74.08 }, { lat: 4.61, lon: -74.08 }, R)).toBe(1112);
  });

  it('un grado de longitud sobre el ecuador son 111195 m', () => {
    expect(haversineMeters({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }, R)).toBe(111195);
  });

  it('el mismo punto es 0', () => {
    expect(haversineMeters({ lat: 4.6, lon: -74.08 }, { lat: 4.6, lon: -74.08 }, R)).toBe(0);
  });

  it('es simetrica', () => {
    const a = { lat: 4.5981, lon: -74.076 };
    const b = { lat: 4.6766, lon: -74.0484 };
    expect(haversineMeters(a, b, R)).toBe(haversineMeters(b, a, R));
  });

  it('devuelve metros enteros', () => {
    const d = haversineMeters({ lat: 4.5981, lon: -74.076 }, { lat: 4.6766, lon: -74.0484 }, R);
    expect(Number.isInteger(d)).toBe(true);
  });

  it('rechaza coordenadas fuera de rango o no numericas', () => {
    expect(() => haversineMeters({ lat: 91, lon: 0 }, { lat: 0, lon: 0 }, R)).toThrow(DomainError);
    expect(() => haversineMeters({ lat: 0, lon: 181 }, { lat: 0, lon: 0 }, R)).toThrow(DomainError);
    expect(() => haversineMeters({ lat: '4.6', lon: 0 }, { lat: 0, lon: 0 }, R)).toThrow(
      DomainError,
    );
    expect(() => haversineMeters({ lat: NaN, lon: 0 }, { lat: 0, lon: 0 }, R)).toThrow(DomainError);
  });
});
