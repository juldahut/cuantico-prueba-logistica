'use strict';

const request = require('supertest');
const app = require('../src/app');
const { ingestEvent } = require('../src/services/ingestion.service');
const {
  db,
  sequelize,
  resetDb,
  createMerchant,
  createUser,
  PICKUP,
  DROPOFF,
} = require('./helpers');

let merchantA;
let merchantB;
let courier;
let opsA;
let admin;

// Entrega minima: creada + asignada + recogida + terminal en `endAt`.
async function ingestDelivery({ id, merchantId, courierId, endAt, ending = 'entregada' }) {
  const base = { deliveryId: id, merchantId };
  const t = Date.parse(endAt);
  const at = (minutesBefore) => new Date(t - minutesBefore * 60000).toISOString();
  const events = [
    { ...base, eventId: `${id}-1`, type: 'creada', occurredAt: at(60), address: `Calle ${id}` },
    { ...base, eventId: `${id}-2`, type: 'asignada', occurredAt: at(50), courierId },
    { ...base, eventId: `${id}-3`, type: 'recogida', occurredAt: at(40), location: PICKUP },
  ];
  if (ending === 'entregada') {
    events.push({
      ...base,
      eventId: `${id}-4`,
      type: 'entregada',
      occurredAt: endAt,
      location: DROPOFF,
    });
  } else if (ending === 'fallida') {
    events.push({ ...base, eventId: `${id}-4`, type: 'fallida', occurredAt: endAt });
  }
  for (const event of events) await ingestEvent(event);
}

beforeAll(async () => {
  await resetDb();
  ({ merchant: merchantA } = await createMerchant({ name: 'Comercio A' }));
  ({ merchant: merchantB } = await createMerchant({
    name: 'Comercio B',
    timeZone: 'America/Mexico_City',
  }));
  courier = await db.Courier.create({ name: 'Mensajero X' });
  const other = await db.Courier.create({ name: 'Mensajero Y' });

  const a = merchantA.id;
  await ingestDelivery({
    id: 'A-1',
    merchantId: a,
    courierId: courier.id,
    endAt: '2026-01-15T19:00:00Z',
  });
  await ingestDelivery({
    id: 'A-2',
    merchantId: a,
    courierId: courier.id,
    endAt: '2026-01-15T20:00:00Z',
    ending: 'fallida',
  });
  // 23:59:59 del 15 en Bogota: entra en el rango y es nocturna.
  await ingestDelivery({
    id: 'A-3',
    merchantId: a,
    courierId: other.id,
    endAt: '2026-01-16T04:59:59Z',
  });
  // 00:00:00 del 16 en Bogota: ya queda fuera de [15, 16).
  await ingestDelivery({
    id: 'A-4',
    merchantId: a,
    courierId: other.id,
    endAt: '2026-01-16T05:00:00Z',
  });
  await ingestDelivery({
    id: 'A-5',
    merchantId: a,
    courierId: other.id,
    endAt: '2026-01-15T21:00:00Z',
    ending: 'en_curso',
  });
  await ingestDelivery({
    id: 'B-1',
    merchantId: merchantB.id,
    courierId: courier.id,
    endAt: '2026-01-15T19:00:00Z',
  });

  opsA = await createUser({ role: 'operaciones', merchantIds: [a] });
  admin = await createUser({ role: 'admin' });
});

afterAll(async () => {
  await sequelize.close();
});

describe('GET /merchants', () => {
  it('cada usuario ve solo los comercios de su alcance', async () => {
    const own = await request(app).get('/merchants').set(opsA.auth);
    const all = await request(app).get('/merchants').set(admin.auth);

    expect(own.body.data).toEqual([
      { id: merchantA.id, name: 'Comercio A', timeZone: 'America/Bogota' },
    ]);
    expect(all.body.data.map((m) => m.name)).toEqual(['Comercio A', 'Comercio B']);
    expect(JSON.stringify(all.body)).not.toMatch(/notes/);
  });
});

describe('GET /merchants/:id/totals', () => {
  it('suma costo y entregas terminadas en [desde, hasta) en la zona del comercio', async () => {
    const res = await request(app)
      .get(`/merchants/${merchantA.id}/totals`)
      .query({ from: '2026-01-15', to: '2026-01-16' })
      .set(opsA.auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      merchantId: merchantA.id,
      merchantName: 'Comercio A',
      timeZone: 'America/Bogota',
      from: '2026-01-15',
      to: '2026-01-16',
      fromUtc: '2026-01-15T05:00:00.000Z',
      toUtc: '2026-01-16T05:00:00.000Z',
      deliveries: 3,
      byCostStatus: { calculated: 2, failed: 1 },
      // 6334 (diurna) + 2000 (fallida) + 7285 (nocturna)
      totals: [{ currency: 'COP', amount: 15619 }],
    });
  });

  it('un usuario de operaciones no puede consultar otro comercio (403)', async () => {
    const res = await request(app)
      .get(`/merchants/${merchantB.id}/totals`)
      .query({ from: '2026-01-15', to: '2026-01-16' })
      .set(opsA.auth);

    expect(res.status).toBe(403);
  });

  it('admin puede consultar cualquier comercio', async () => {
    const res = await request(app)
      .get(`/merchants/${merchantB.id}/totals`)
      .query({ from: '2026-01-15', to: '2026-01-16' })
      .set(admin.auth);

    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual([{ currency: 'COP', amount: 6334 }]);
  });

  it('valida el rango', async () => {
    for (const query of [
      { from: '2026-01-16', to: '2026-01-15' },
      { from: 'ayer', to: '2026-01-15' },
      { from: '2026-01-15' },
    ]) {
      const res = await request(app)
        .get(`/merchants/${merchantA.id}/totals`)
        .query(query)
        .set(opsA.auth);
      expect([400, 422]).toContain(res.status);
    }
  });
});

describe('GET /couriers/:id/status-counts', () => {
  it('cuenta entregas por estado solo dentro del alcance del usuario', async () => {
    const own = await request(app).get(`/couriers/${courier.id}/status-counts`).set(opsA.auth);
    const all = await request(app).get(`/couriers/${courier.id}/status-counts`).set(admin.auth);

    expect(own.status).toBe(200);
    expect(own.body).toEqual({
      courierId: courier.id,
      courierName: 'Mensajero X',
      counts: { entregada: 1, fallida: 1 },
    });
    expect(all.body.counts).toEqual({ entregada: 2, fallida: 1 });
  });

  it('mensajero inexistente responde 404', async () => {
    expect((await request(app).get('/couriers/99999/status-counts').set(admin.auth)).status).toBe(
      404,
    );
  });

  it('operaciones recibe 404 si el mensajero no tiene entregas en sus comercios', async () => {
    const onlyB = await db.Courier.create({ name: 'Mensajero solo B' });
    await ingestDelivery({
      id: 'B-Z',
      merchantId: merchantB.id,
      courierId: onlyB.id,
      endAt: '2026-01-20T19:00:00Z',
    });

    const res = await request(app).get(`/couriers/${onlyB.id}/status-counts`).set(opsA.auth);

    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toMatch(/solo B/);
  });

  it('ids fuera del rango de enteros responden 422, no 500', async () => {
    expect(
      (await request(app).get('/couriers/99999999999/status-counts').set(admin.auth)).status,
    ).toBe(422);
    expect(
      (
        await request(app)
          .get('/merchants/99999999999/totals')
          .query({ from: '2026-01-15', to: '2026-01-16' })
          .set(admin.auth)
      ).status,
    ).toBe(422);
  });
});

describe('totales: entregas sin monto y varias monedas', () => {
  let merchantC;

  beforeAll(async () => {
    let tariff;
    ({ merchant: merchantC, tariff } = await createMerchant({ name: 'Comercio C' }));
    // Cambio de tarifa a mitad del dia: COP hasta las 20:00Z, USD desde ahi.
    await tariff.update({ validTo: new Date('2026-01-15T20:00:00Z') });
    await db.Tariff.create({
      merchantId: merchantC.id,
      baseAmount: 500,
      perKmAmount: 100,
      currency: 'USD',
      validFrom: new Date('2026-01-15T20:00:00Z'),
    });
    const c = merchantC.id;
    await ingestDelivery({
      id: 'C-1',
      merchantId: c,
      courierId: courier.id,
      endAt: '2026-01-15T19:00:00Z',
    });
    await ingestDelivery({
      id: 'C-2',
      merchantId: c,
      courierId: courier.id,
      endAt: '2026-01-15T21:00:00Z',
    });
    // Entregada sin recogida: cuenta como entrega, pero no suma.
    await ingestEvent({
      eventId: 'C-3-4',
      deliveryId: 'C-3',
      merchantId: c,
      type: 'entregada',
      occurredAt: '2026-01-15T22:00:00Z',
      location: DROPOFF,
    });
  });

  it('suma por moneda y cuenta las entregas sin monto sin sumarlas como 0', async () => {
    const res = await request(app)
      .get(`/merchants/${merchantC.id}/totals`)
      .query({ from: '2026-01-15', to: '2026-01-16' })
      .set(admin.auth);

    expect(res.body.deliveries).toBe(3);
    expect(res.body.byCostStatus).toEqual({ calculated: 2, incomplete: 1 });
    // 500 + 1112 m x 100/km = 611.2 -> 611
    expect(res.body.totals).toEqual([
      { currency: 'COP', amount: 6334 },
      { currency: 'USD', amount: 611 },
    ]);
  });
});

describe('GET /deliveries/:id/cost-audit', () => {
  it('devuelve el historial de calculos con sus entradas', async () => {
    const res = await request(app).get('/deliveries/A-3/cost-audit').set(opsA.auth);

    expect(res.status).toBe(200);
    expect(res.body.delivery).toMatchObject({ id: 'A-3', costAmount: 7285, status: 'entregada' });
    const [latest] = res.body.calculations;
    expect(latest).toMatchObject({
      status: 'calculated',
      amount: 7285,
      isNight: true,
      rulesVersion: 'v1',
      timeZone: 'America/Bogota',
      breakdown: { base: 5000, distance: 1334, nightSurcharge: 951 },
      tariffSnapshot: { baseAmount: 5000, perKmAmount: 1200, currency: 'COP' },
      eventIds: ['A-3-1', 'A-3-2', 'A-3-3', 'A-3-4'],
    });
    expect(latest.inputHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('la entrega de otro comercio responde 404 (no revela que existe)', async () => {
    expect((await request(app).get('/deliveries/B-1/cost-audit').set(opsA.auth)).status).toBe(404);
    expect((await request(app).get('/deliveries/B-1/cost-audit').set(admin.auth)).status).toBe(200);
  });
});

describe('GET /anomalies con alcance', () => {
  it('operaciones solo ve las anomalias de sus comercios', async () => {
    await ingestEvent({
      eventId: 'B-X',
      deliveryId: 'B-X',
      merchantId: merchantB.id,
      type: 'entregada',
      occurredAt: '2026-01-15T19:00:00Z',
      location: DROPOFF,
    });

    const own = await request(app).get('/anomalies').set(opsA.auth);
    const all = await request(app).get('/anomalies').set(admin.auth);

    expect(own.body.data.every((a) => a.merchantId === merchantA.id)).toBe(true);
    expect(all.body.data.some((a) => a.deliveryId === 'B-X')).toBe(true);
  });
});
