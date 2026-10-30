'use strict';

const { calculateDeliveryCost, DomainError } = require('../../src/domain');

const BOGOTA = 'America/Bogota'; // UTC-5
const TARIFF = Object.freeze({ baseAmount: 5000, perKmAmount: 1200, currency: 'COP' });
// Misma longitud, 0.01 grados de latitud: 1112 m.
const PICKUP = Object.freeze({ lat: 4.6, lon: -74.08 });
const DROPOFF = Object.freeze({ lat: 4.61, lon: -74.08 });

// Subtotal = 5000 + 1112 m x 1200/km = 6334.4
const DAY_AMOUNT = 6334;
// 6334.4 x 1.15 = 7284.56
const NIGHT_AMOUNT = 7285;

function ev(id, type, occurredAt, location) {
  const event = { eventId: id, deliveryId: 'D-1', type, occurredAt };
  if (location) event.location = location;
  return event;
}

// Entrega completa: los eventos previos ocurren minutos antes de la recogida.
function completeDelivery({ pickedUpAt = '2026-01-15T18:20:00Z', deliveredAt }) {
  return [
    ev('e1', 'creada', '2026-01-15T18:00:00Z'),
    ev('e2', 'asignada', '2026-01-15T18:05:00Z'),
    ev('e3', 'recogida', pickedUpAt, PICKUP),
    ev('e4', 'en_ruta', pickedUpAt.replace(/:00Z$/, ':30Z')),
    ev('e5', 'entregada', deliveredAt, DROPOFF),
  ];
}

function failedDelivery(failedAt = '2026-01-16T02:00:00Z') {
  return [
    ev('f1', 'creada', '2026-01-15T18:00:00Z'),
    ev('f2', 'asignada', '2026-01-15T18:05:00Z'),
    ev('f3', 'recogida', '2026-01-15T18:20:00Z', PICKUP),
    ev('f4', 'fallida', failedAt, DROPOFF),
  ];
}

function calc(events, timeZone = BOGOTA, extra = {}) {
  return calculateDeliveryCost({ events, tariff: TARIFF, timeZone, ...extra });
}

function errorCode(fn) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(DomainError);
    return err.code;
  }
  throw new Error('se esperaba un DomainError');
}

function* permutations(items) {
  if (items.length <= 1) {
    yield items;
    return;
  }
  for (let i = 0; i < items.length; i += 1) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const perm of permutations(rest)) yield [items[i], ...perm];
  }
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('calculateDeliveryCost', () => {
  describe('entrega diurna', () => {
    it('cobra base + distancia, sin recargo', () => {
      // 19:00Z = 14:00 en Bogota
      const result = calc(completeDelivery({ deliveredAt: '2026-01-15T19:00:00Z' }));

      expect(result).toEqual({
        status: 'calculated',
        amount: DAY_AMOUNT,
        currency: 'COP',
        rulesVersion: 'v1',
        breakdown: { base: 5000, distance: 1334, nightSurcharge: 0 },
        distanceMeters: 1112,
        isNight: false,
        eventIdsUsed: ['e1', 'e2', 'e3', 'e4', 'e5'],
        reason: null,
      });
    });
  });

  describe('horario nocturno', () => {
    it('20:00 exacto hora local cobra el 15% sobre base + distancia', () => {
      const result = calc(completeDelivery({ deliveredAt: '2026-01-16T01:00:00Z' }));

      expect(result.amount).toBe(NIGHT_AMOUNT);
      expect(result.isNight).toBe(true);
      expect(result.breakdown).toEqual({ base: 5000, distance: 1334, nightSurcharge: 951 });
    });

    it('06:00 exacto hora local ya es diurno', () => {
      const result = calc(completeDelivery({ deliveredAt: '2026-01-16T11:00:00Z' }));

      expect(result.amount).toBe(DAY_AMOUNT);
      expect(result.isNight).toBe(false);
    });

    it('recogida de noche y entregada de dia cobra como diurno', () => {
      // Recogida 05:30 local, entregada 06:10 local
      const result = calc(
        completeDelivery({
          pickedUpAt: '2026-01-16T10:30:00Z',
          deliveredAt: '2026-01-16T11:10:00Z',
        }),
      );

      expect(result.amount).toBe(DAY_AMOUNT);
      expect(result.isNight).toBe(false);
    });

    it('el desglose siempre suma el total', () => {
      const { amount, breakdown } = calc(completeDelivery({ deliveredAt: '2026-01-16T01:00:00Z' }));
      expect(breakdown.base + breakdown.distance + breakdown.nightSurcharge).toBe(amount);
    });
  });

  describe('zona horaria del comercio', () => {
    it('el mismo instante UTC cambia de tarifa segun la zona del comercio', () => {
      const events = completeDelivery({ deliveredAt: '2026-01-16T01:00:00Z' });

      // 01:00Z = 20:00 en Bogota (noche) y 19:00 en Ciudad de Mexico (dia)
      expect(calc(events, 'America/Bogota').amount).toBe(NIGHT_AMOUNT);
      expect(calc(events, 'America/Mexico_City').amount).toBe(DAY_AMOUNT);
    });
  });

  describe('entrega fallida', () => {
    it('cobra el 40% de la base, sin distancia ni recargo aunque sea de noche', () => {
      // 02:00Z = 21:00 en Bogota
      const result = calc(failedDelivery('2026-01-16T02:00:00Z'));

      expect(result).toEqual({
        status: 'failed',
        amount: 2000,
        currency: 'COP',
        rulesVersion: 'v1',
        breakdown: { base: 2000, distance: 0, nightSurcharge: 0 },
        distanceMeters: null,
        isNight: null,
        eventIdsUsed: ['f1', 'f2', 'f3', 'f4'],
        reason: null,
      });
    });

    it('sin recogida tambien cobra el 40% de la base', () => {
      const events = [
        ev('f1', 'creada', '2026-01-15T18:00:00Z'),
        ev('f2', 'fallida', '2026-01-15T18:30:00Z'),
      ];

      expect(calc(events).amount).toBe(2000);
      expect(calc(events).status).toBe('failed');
    });
  });

  describe('idempotencia', () => {
    it('el mismo evento repetido tres veces no altera el costo', () => {
      const events = completeDelivery({ deliveredAt: '2026-01-16T01:00:00Z' });
      const copy = (e) => structuredClone(e);
      const withDuplicates = [
        events[4],
        copy(events[2]),
        events[0],
        copy(events[4]),
        events[1],
        events[2],
        copy(events[4]),
        events[3],
        copy(events[2]),
      ];

      expect(calc(withDuplicates)).toEqual(calc(events));
    });

    it('mismo eventId con contenido distinto es un conflicto', () => {
      const events = completeDelivery({ deliveredAt: '2026-01-15T19:00:00Z' });
      const tampered = { ...events[4], occurredAt: '2026-01-16T01:00:00Z' };

      expect(errorCode(() => calc([...events, tampered]))).toBe('EVENT_CONFLICT');
    });
  });

  describe('desorden', () => {
    it('las 720 permutaciones de una entrega completa dan el mismo resultado', () => {
      const events = [
        ...completeDelivery({ deliveredAt: '2026-01-16T01:00:00Z' }),
        ev('e6', 'en_ruta', '2026-01-15T18:40:00Z'),
      ];
      const expected = calc(events);
      let count = 0;

      for (const perm of permutations(events)) {
        expect(calc(perm)).toEqual(expected);
        count += 1;
      }
      expect(count).toBe(720);
    });

    it('todas las permutaciones de una entrega fallida dan el mismo resultado', () => {
      const events = failedDelivery();
      const expected = calc(events);

      for (const perm of permutations(events)) {
        expect(calc(perm)).toEqual(expected);
      }
    });
  });

  describe('entregas sin costo definible', () => {
    it('entregada sin recogida queda incompleta y sin monto (no 0)', () => {
      const events = [
        ev('e1', 'creada', '2026-01-15T18:00:00Z'),
        ev('e5', 'entregada', '2026-01-15T19:00:00Z', DROPOFF),
      ];
      const result = calc(events);

      expect(result.status).toBe('incomplete');
      expect(result.amount).toBeNull();
      expect(result.breakdown).toBeNull();
      expect(result.reason).toBe('MISSING_PICKUP');
    });

    it('sin evento terminal queda incompleta', () => {
      const events = completeDelivery({ deliveredAt: '2026-01-15T19:00:00Z' }).slice(0, 4);
      const result = calc(events);

      expect(result.status).toBe('incomplete');
      expect(result.amount).toBeNull();
      expect(result.reason).toBe('NOT_FINISHED');
    });

    it('entregada y fallida a la vez es inconsistente y sin monto', () => {
      const events = [
        ...completeDelivery({ deliveredAt: '2026-01-15T19:00:00Z' }),
        ev('e9', 'fallida', '2026-01-15T19:30:00Z'),
      ];
      const result = calc(events);

      expect(result.status).toBe('inconsistent');
      expect(result.amount).toBeNull();
      expect(result.reason).toBe('BOTH_TERMINAL');
    });
  });

  describe('validacion de entradas', () => {
    const events = completeDelivery({ deliveredAt: '2026-01-15T19:00:00Z' });

    it('rechaza una version de reglas desconocida', () => {
      expect(errorCode(() => calc(events, BOGOTA, { rulesVersion: 'v99' }))).toBe(
        'UNKNOWN_RULES_VERSION',
      );
    });

    it('rechaza tarifas no enteras o negativas', () => {
      const bad = [
        { ...TARIFF, baseAmount: 5000.5 },
        { ...TARIFF, perKmAmount: -1 },
        { ...TARIFF, baseAmount: '5000' },
        { ...TARIFF, currency: '' },
      ];
      for (const tariff of bad) {
        expect(errorCode(() => calculateDeliveryCost({ events, tariff, timeZone: BOGOTA }))).toBe(
          'INVALID_TARIFF',
        );
      }
    });

    it('rechaza una zona horaria invalida', () => {
      expect(errorCode(() => calc(events, 'Marte/Olympus'))).toBe('INVALID_TIMEZONE');
    });

    it('rechaza occurredAt sin Z', () => {
      const bad = [...events.slice(0, 4), { ...events[4], occurredAt: '2026-01-15T19:00:00' }];
      expect(errorCode(() => calc(bad))).toBe('INVALID_EVENT');
    });

    it('rechaza recogida o entregada sin coordenadas', () => {
      const noPickupLocation = events.map((e) => {
        if (e.type !== 'recogida') return e;
        const { location: _location, ...rest } = e;
        return rest;
      });
      expect(errorCode(() => calc(noPickupLocation))).toBe('INVALID_EVENT');
    });

    it('rechaza tipos de evento desconocidos', () => {
      expect(
        errorCode(() => calc([...events, ev('x1', 'teletransportada', '2026-01-15T19:10:00Z')])),
      ).toBe('INVALID_EVENT');
    });

    it('rechaza eventos de entregas distintas', () => {
      const other = { ...ev('x2', 'creada', '2026-01-15T18:00:00Z'), deliveryId: 'D-2' };
      expect(errorCode(() => calc([...events, other]))).toBe('MIXED_DELIVERIES');
    });
  });

  describe('pureza', () => {
    it('no muta los eventos ni la tarifa de entrada', () => {
      const events = deepFreeze(completeDelivery({ deliveredAt: '2026-01-16T01:00:00Z' }));
      const before = JSON.stringify(events);

      expect(() => calc(events)).not.toThrow();
      expect(JSON.stringify(events)).toBe(before);
    });
  });
});
