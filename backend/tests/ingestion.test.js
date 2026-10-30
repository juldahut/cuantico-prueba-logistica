'use strict';

const request = require('supertest');
const app = require('../src/app');
const { db, sequelize, resetDb, createMerchant, deliveryEvents, DROPOFF } = require('./helpers');

let merchant;

beforeEach(async () => {
  await resetDb();
  ({ merchant } = await createMerchant());
});

afterAll(async () => {
  await sequelize.close();
});

function post(event) {
  return request(app).post('/events').send(event);
}

async function postAll(events) {
  const responses = [];
  for (const event of events) responses.push(await post(event));
  return responses;
}

async function delivery(id = 'D-1') {
  return db.Delivery.findByPk(id);
}

async function anomalies(code) {
  return db.Anomaly.findAll({ where: { code }, order: [['id', 'ASC']] });
}

describe('POST /events', () => {
  it('registra un evento nuevo y crea la proyeccion de la entrega', async () => {
    const [first] = deliveryEvents(merchant.id);
    const res = await post(first);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      eventId: 'D-1-e1',
      deliveryId: 'D-1',
      duplicate: false,
      delivery: { status: 'creada', costStatus: 'incomplete', costAmount: null },
    });
    const stored = await delivery();
    expect(stored.merchantId).toBe(merchant.id);
    expect(stored.address).toBe('Calle 80 # 20-10');
  });

  it('calcula el costo cuando la entrega termina', async () => {
    const responses = await postAll(deliveryEvents(merchant.id));

    expect(responses.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
    const stored = await delivery();
    expect(stored.status).toBe('entregada');
    expect(stored.costStatus).toBe('calculated');
    expect(stored.costAmount).toBe(6334);
    expect(stored.completedAt.toISOString()).toBe('2026-01-15T19:00:00.000Z');
  });

  describe('idempotencia', () => {
    it('el mismo evento x3 responde 200 sin efecto y no duplica filas ni calculos', async () => {
      const events = deliveryEvents(merchant.id);
      await postAll(events);
      const calcsBefore = await db.CostCalculation.count();

      const retries = await postAll([events[4], events[4], events[4]]);

      expect(retries.map((r) => r.status)).toEqual([200, 200, 200]);
      expect(retries[0].body).toMatchObject({ eventId: 'D-1-e5', duplicate: true });
      expect(await db.DeliveryEvent.count({ where: { eventId: 'D-1-e5' } })).toBe(1);
      expect(await db.CostCalculation.count()).toBe(calcsBefore);
      expect((await delivery()).costAmount).toBe(6334);
    });

    it('el mismo evento enviado 10 veces en paralelo se inserta una sola vez', async () => {
      const [first] = deliveryEvents(merchant.id);
      const responses = await Promise.all(Array.from({ length: 10 }, () => post(first)));
      const statuses = responses.map((r) => r.status).sort();

      expect(statuses.filter((s) => s === 201)).toHaveLength(1);
      expect(statuses.filter((s) => s === 200)).toHaveLength(9);
      expect(await db.DeliveryEvent.count()).toBe(1);
    });

    it('eventos distintos de la misma entrega en paralelo dejan el costo correcto', async () => {
      const responses = await Promise.all(deliveryEvents(merchant.id).map(post));

      expect(responses.every((r) => r.status === 201)).toBe(true);
      const stored = await delivery();
      expect(stored.costStatus).toBe('calculated');
      expect(stored.costAmount).toBe(6334);
      const last = await db.CostCalculation.findOne({ order: [['id', 'DESC']] });
      expect(last.eventIds).toHaveLength(5);
    });

    it('mismo eventId con contenido distinto responde 409 y deja una anomalia visible', async () => {
      const events = deliveryEvents(merchant.id);
      await postAll(events);
      const tampered = { ...events[4], location: { lat: 4.7, lon: -74.08 } };

      const res = await post(tampered);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EVENT_CONFLICT');
      const [anomaly] = await anomalies('EVENT_CONFLICT');
      expect(anomaly).toMatchObject({ deliveryId: 'D-1', eventId: 'D-1-e5' });
      // El evento original no cambia.
      const stored = await db.DeliveryEvent.findOne({ where: { eventId: 'D-1-e5' } });
      expect(stored.payload.location).toEqual(DROPOFF);
      expect((await delivery()).costAmount).toBe(6334);
    });
  });

  describe('desorden', () => {
    it('la entregada antes que su recogida da el mismo costo que en orden', async () => {
      const events = deliveryEvents(merchant.id);
      const reversed = [...events].reverse();

      await postAll(reversed);
      await postAll(deliveryEvents(merchant.id, 'D-2'));

      expect((await delivery('D-1')).costAmount).toBe(6334);
      expect((await delivery('D-2')).costAmount).toBe(6334);
      expect((await delivery('D-1')).status).toBe('entregada');
    });

    it('mientras falta la recogida queda MISSING_PICKUP y se resuelve cuando llega', async () => {
      const events = deliveryEvents(merchant.id);
      await post(events[4]);

      expect((await delivery()).costStatus).toBe('incomplete');
      const [open] = await anomalies('MISSING_PICKUP');
      expect(open.resolvedAt).toBeNull();

      await post(events[2]);

      expect((await delivery()).costAmount).toBe(6334);
      const [closed] = await anomalies('MISSING_PICKUP');
      expect(closed.resolvedAt).not.toBeNull();
    });
  });

  describe('estados', () => {
    it('la proyeccion sigue el ultimo estado por occurredAt', async () => {
      const events = deliveryEvents(merchant.id);
      await postAll(events.slice(0, 2));
      expect((await delivery()).status).toBe('asignada');
    });

    it('fallida cobra el 40% de la base', async () => {
      const [creada, asignada] = deliveryEvents(merchant.id);
      await postAll([
        creada,
        asignada,
        { ...asignada, eventId: 'D-1-f', type: 'fallida', occurredAt: '2026-01-15T19:00:00Z' },
      ]);

      const stored = await delivery();
      expect(stored.status).toBe('fallida');
      expect(stored.costAmount).toBe(2000);
    });

    it('entregada y fallida a la vez queda inconsistente y como anomalia', async () => {
      const events = deliveryEvents(merchant.id);
      await postAll([
        ...events,
        { ...events[3], eventId: 'D-1-f', type: 'fallida', occurredAt: '2026-01-15T19:30:00Z' },
      ]);

      const stored = await delivery();
      expect(stored.status).toBe('inconsistente');
      expect(stored.costAmount).toBeNull();
      expect(await anomalies('BOTH_TERMINAL')).toHaveLength(1);
    });

    it('una transicion fuera de orden en el tiempo se registra como anomalia, no se rechaza', async () => {
      const events = deliveryEvents(merchant.id);
      // en_ruta ocurre despues de la entrega
      const late = { ...events[3], occurredAt: '2026-01-15T19:10:00Z' };
      const res = await postAll([...events.slice(0, 3), events[4], late]);

      expect(res.every((r) => r.status === 201)).toBe(true);
      expect(await anomalies('INVALID_TRANSITION')).toHaveLength(1);
      expect((await delivery()).costAmount).toBe(6334);
    });

    it('un evento con otro comercio para la misma entrega responde 409 y deja anomalia', async () => {
      const { merchant: other } = await createMerchant({ name: 'Otro comercio' });
      const [creada, asignada] = deliveryEvents(merchant.id);
      await post(creada);

      const res = await post({ ...asignada, merchantId: other.id });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('MERCHANT_MISMATCH');
      expect(await anomalies('MERCHANT_MISMATCH')).toHaveLength(1);
      expect(await db.DeliveryEvent.count()).toBe(1);
    });

    it('sin tarifa vigente guarda el evento y deja anomalia NO_TARIFF', async () => {
      const events = deliveryEvents(merchant.id).map((e) => ({
        ...e,
        occurredAt: e.occurredAt.replace('2026-', '2025-'),
      }));
      await postAll(events);

      expect(await db.DeliveryEvent.count()).toBe(5);
      expect((await delivery()).costAmount).toBeNull();
      expect(await anomalies('NO_TARIFF')).toHaveLength(1);
    });
  });

  describe('fechas y validacion', () => {
    it('normaliza un occurredAt con offset a UTC', async () => {
      const [first] = deliveryEvents(merchant.id);
      const res = await post({ ...first, occurredAt: '2026-01-15T13:00:00-05:00' });

      expect(res.status).toBe(201);
      const stored = await db.DeliveryEvent.findOne({ where: { eventId: first.eventId } });
      expect(stored.occurredAt.toISOString()).toBe('2026-01-15T18:00:00.000Z');
      expect(stored.payload.occurredAt).toBe('2026-01-15T18:00:00.000Z');
    });

    it('el mismo instante con otro offset es un duplicado, no un conflicto', async () => {
      const [first] = deliveryEvents(merchant.id);
      await post(first);
      const res = await post({ ...first, occurredAt: '2026-01-15T13:00:00-05:00' });

      expect(res.status).toBe(200);
      expect(res.body.duplicate).toBe(true);
    });

    it('rechaza un occurredAt sin zona horaria con 422', async () => {
      const [first] = deliveryEvents(merchant.id);
      const res = await post({ ...first, occurredAt: '2026-01-15T18:00:00' });

      expect(res.status).toBe(422);
      expect(await db.DeliveryEvent.count()).toBe(0);
    });

    it('rechaza cuerpos invalidos con 422', async () => {
      const [first, , recogida] = deliveryEvents(merchant.id);
      const invalid = [
        { ...first, type: 'teletransportada' },
        { ...first, eventId: 'con espacios' },
        { ...first, merchantId: 'uno' },
        { ...recogida, location: undefined },
        { ...recogida, location: { lat: 200, lon: 0 } },
        { ...first, address: 'x'.repeat(201) },
      ];

      for (const body of invalid) {
        expect((await post(body)).status).toBe(422);
      }
      expect(await db.DeliveryEvent.count()).toBe(0);
    });

    it('rechaza un comercio inexistente con 422', async () => {
      const [first] = deliveryEvents(9999);
      expect((await post(first)).status).toBe(422);
    });
  });

  describe('auditoria', () => {
    it('cost_calculations es append-only en la base de datos', async () => {
      await postAll(deliveryEvents(merchant.id));
      const calc = await db.CostCalculation.findOne();

      await expect(
        sequelize.query('UPDATE cost_calculations SET amount = 1 WHERE id = :id', {
          replacements: { id: calc.id },
        }),
      ).rejects.toThrow(/append-only/);
    });

    it('guarda eventos usados, tarifa, version de reglas y hash de entradas', async () => {
      await postAll(deliveryEvents(merchant.id));
      const calc = await db.CostCalculation.findOne({ order: [['id', 'DESC']] });

      expect(calc).toMatchObject({
        status: 'calculated',
        amount: 6334,
        rulesVersion: 'v1',
        timeZone: 'America/Bogota',
        breakdown: { base: 5000, distance: 1334, nightSurcharge: 0 },
        tariffSnapshot: { baseAmount: 5000, perKmAmount: 1200, currency: 'COP' },
      });
      expect(calc.eventIds).toEqual(['D-1-e1', 'D-1-e2', 'D-1-e3', 'D-1-e4', 'D-1-e5']);
      expect(calc.inputHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});

describe('GET /anomalies', () => {
  beforeEach(async () => {
    await resetDb();
    ({ merchant } = await createMerchant());
  });

  it('lista las anomalias abiertas, filtrables por codigo', async () => {
    const events = deliveryEvents(merchant.id);
    await post(events[4]); // MISSING_PICKUP
    await post({ ...events[0], eventId: 'D-1-e1' });
    await post({ ...events[0], address: 'otra direccion' }); // EVENT_CONFLICT

    const all = await request(app).get('/anomalies');
    expect(all.status).toBe(200);
    expect(all.body.data.map((a) => a.code).sort()).toEqual(['EVENT_CONFLICT', 'MISSING_PICKUP']);

    const filtered = await request(app).get('/anomalies').query({ code: 'EVENT_CONFLICT' });
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.data[0]).not.toHaveProperty('dedupKey');
  });

  it('valida el filtro de codigo', async () => {
    const res = await request(app).get('/anomalies').query({ code: "x' OR 1=1 --" });
    expect(res.status).toBe(422);
  });
});
