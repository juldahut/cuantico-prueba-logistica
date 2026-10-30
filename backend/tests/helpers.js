'use strict';

const db = require('../src/models');

const { sequelize } = db;
const { hashPassword, issueToken } = require('../src/services/auth.service');

const TEST_PASSWORD = 'clave-de-prueba-123';

// Vacia las tablas entre pruebas. TRUNCATE no dispara el trigger append-only
// de cost_calculations (es por fila, para UPDATE y DELETE).
async function resetDb() {
  await sequelize.query(
    `TRUNCATE user_merchants, users, anomalies, cost_calculations, delivery_events, deliveries,
       tariffs, couriers, merchants
     RESTART IDENTITY CASCADE`,
  );
}

async function createMerchant({
  name = 'Comercio Prueba',
  timeZone = 'America/Bogota',
  baseAmount = 5000,
  perKmAmount = 1200,
  validFrom = new Date('2026-01-01T00:00:00Z'),
} = {}) {
  const merchant = await db.Merchant.create({ name, timeZone, notes: null });
  const tariff = await db.Tariff.create({
    merchantId: merchant.id,
    baseAmount,
    perKmAmount,
    currency: 'COP',
    validFrom,
  });
  return { merchant, tariff };
}

const PICKUP = { lat: 4.6, lon: -74.08 };
const DROPOFF = { lat: 4.61, lon: -74.08 };

// Eventos de una entrega completa diurna en Bogota: costo esperado 6334.
function deliveryEvents(merchantId, deliveryId = 'D-1', prefix = deliveryId) {
  return [
    {
      eventId: `${prefix}-e1`,
      deliveryId,
      merchantId,
      type: 'creada',
      occurredAt: '2026-01-15T18:00:00Z',
      address: 'Calle 80 # 20-10',
    },
    {
      eventId: `${prefix}-e2`,
      deliveryId,
      merchantId,
      type: 'asignada',
      occurredAt: '2026-01-15T18:05:00Z',
    },
    {
      eventId: `${prefix}-e3`,
      deliveryId,
      merchantId,
      type: 'recogida',
      occurredAt: '2026-01-15T18:20:00Z',
      location: PICKUP,
    },
    {
      eventId: `${prefix}-e4`,
      deliveryId,
      merchantId,
      type: 'en_ruta',
      occurredAt: '2026-01-15T18:25:00Z',
    },
    {
      eventId: `${prefix}-e5`,
      deliveryId,
      merchantId,
      type: 'entregada',
      occurredAt: '2026-01-15T19:00:00Z',
      location: DROPOFF,
    },
  ];
}

// Crea un usuario y devuelve su token. merchantIds solo aplica a operaciones.
async function createUser({ role = 'admin', merchantIds = [], email } = {}) {
  const user = await db.User.create({
    email: email || `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@prueba.test`,
    passwordHash: await hashPassword(TEST_PASSWORD),
    role,
  });
  for (const merchantId of merchantIds) {
    await db.UserMerchant.create({ userId: user.id, merchantId });
  }
  return { user, token: issueToken(user), auth: { Authorization: `Bearer ${issueToken(user)}` } };
}

module.exports = {
  db,
  sequelize,
  resetDb,
  createMerchant,
  createUser,
  deliveryEvents,
  PICKUP,
  DROPOFF,
  TEST_PASSWORD,
};
