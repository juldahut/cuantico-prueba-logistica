'use strict';

const request = require('supertest');
const app = require('../src/app');
const { ingestEvent } = require('../src/services/ingestion.service');
const { db, sequelize, resetDb, createMerchant, createUser } = require('./helpers');

let merchantA;
let merchantB;
let opsA;
let admin;

async function created(id, merchantId, address, courierId) {
  await ingestEvent({
    eventId: `${id}-c`,
    deliveryId: id,
    merchantId,
    type: 'creada',
    occurredAt: '2026-01-15T18:00:00Z',
    address,
  });
  if (courierId) {
    await ingestEvent({
      eventId: `${id}-a`,
      deliveryId: id,
      merchantId,
      type: 'asignada',
      occurredAt: '2026-01-15T18:05:00Z',
      courierId,
    });
  }
}

function search(q, user = admin) {
  return request(app).get('/search').query({ q }).set(user.auth);
}

beforeAll(async () => {
  await resetDb();
  ({ merchant: merchantA } = await createMerchant({ name: 'Tienda La 80' }));
  ({ merchant: merchantB } = await createMerchant({ name: 'Farmacia Central' }));
  const courier = await db.Courier.create({ name: 'Ana Rojas' });

  await created('S-1', merchantA.id, 'Calle 80 # 20-10', courier.id);
  await created('S-2', merchantA.id, 'Local 50% descuento');
  await created('S-3', merchantB.id, 'Avenida Siempre Viva');
  for (let i = 0; i < 25; i += 1) {
    await created(`M-${i}`, merchantB.id, `Bodega masiva ${i}`);
  }

  opsA = await createUser({ role: 'operaciones', merchantIds: [merchantA.id] });
  admin = await createUser({ role: 'admin' });
});

afterAll(async () => {
  await sequelize.close();
});

describe('GET /search', () => {
  it('encuentra por nombre de comercio, direccion o mensajero sin importar mayusculas', async () => {
    expect((await search('tienda la')).body.data.map((d) => d.deliveryId).sort()).toEqual([
      'S-1',
      'S-2',
    ]);
    expect((await search('SIEMPRE')).body.data.map((d) => d.deliveryId)).toEqual(['S-3']);
    expect((await search('ana roj')).body.data.map((d) => d.deliveryId)).toEqual(['S-1']);
  });

  it('devuelve solo campos de lectura, sin notas del comercio', async () => {
    const [row] = (await search('Calle 80')).body.data;
    expect(Object.keys(row).sort()).toEqual(
      [
        'address',
        'costAmount',
        'courierName',
        'currency',
        'deliveryId',
        'merchantId',
        'merchantName',
        'status',
      ].sort(),
    );
  });

  it.each([
    "' OR 1=1 --",
    "'; DROP TABLE deliveries; --",
    "x' UNION SELECT email, password_hash FROM users --",
    '\\',
  ])('trata %p como texto literal', async (payload) => {
    const before = await db.Delivery.count();
    const res = await search(payload);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(await db.Delivery.count()).toBe(before);
  });

  it('"%" y "_" no son comodines: no devuelven todo', async () => {
    // Solo la direccion que contiene un % literal, no las 28 entregas.
    expect((await search('%')).body.data.map((d) => d.deliveryId)).toEqual(['S-2']);
    expect((await search('_')).body.data).toEqual([]);
    expect((await search('%%')).body.data).toEqual([]);
  });

  it('"50%" busca el porcentaje literal', async () => {
    expect((await search('50%')).body.data.map((d) => d.deliveryId)).toEqual(['S-2']);
    expect((await search('5_%')).body.data).toEqual([]);
  });

  it('limita a 20 filas', async () => {
    const res = await search('bodega masiva');
    expect(res.body.data).toHaveLength(20);
    expect(res.body.limit).toBe(20);
  });

  it('valida la longitud del texto', async () => {
    expect((await search('x'.repeat(101))).status).toBe(422);
    expect((await search('')).status).toBe(422);
    expect((await request(app).get('/search').set(admin.auth)).status).toBe(422);
    expect(
      (
        await request(app)
          .get('/search')
          .query({ q: ['a', 'b'] })
          .set(admin.auth)
      ).status,
    ).toBe(422);
  });

  it('respeta el alcance: operaciones no ve entregas de otros comercios', async () => {
    expect((await search('Farmacia', opsA)).body.data).toEqual([]);
    expect((await search('Siempre Viva', opsA)).body.data).toEqual([]);
    expect((await search('Tienda', opsA)).body.data).toHaveLength(2);
  });
});
