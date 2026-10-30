'use strict';

const { Op, fn, col } = require('sequelize');
const db = require('../models');
const HttpError = require('../errors/HttpError');
const { localDateRangeToUtc } = require('../domain');
const { canAccessMerchant, merchantFilter } = require('./scope');

function forbidden() {
  return new HttpError(403, 'FORBIDDEN', 'No tienes acceso a este comercio.');
}

async function listMerchants(user) {
  const where = user.merchantIds === null ? {} : { id: { [Op.in]: user.merchantIds } };
  const rows = await db.Merchant.findAll({
    where,
    attributes: ['id', 'name', 'timeZone'],
    order: [['name', 'ASC']],
  });
  return rows.map((m) => ({ id: m.id, name: m.name, timeZone: m.timeZone }));
}

// Entregas terminadas (entregada, fallida o inconsistente) cuyo evento
// terminal cae en [desde, hasta) segun la zona horaria del comercio. Los
// montos se suman por moneda; las entregas sin monto cuentan pero no suman.
async function merchantTotals(user, merchantId, from, to) {
  if (!canAccessMerchant(user, merchantId)) throw forbidden();
  const merchant = await db.Merchant.findByPk(merchantId);
  if (!merchant) throw new HttpError(404, 'NOT_FOUND', 'Comercio no encontrado.');

  const { fromUtc, toUtc } = localDateRangeToUtc(from, to, merchant.timeZone);
  const rows = await db.Delivery.findAll({
    where: { merchantId: merchant.id, completedAt: { [Op.gte]: fromUtc, [Op.lt]: toUtc } },
    attributes: [
      [col('cost_status'), 'costStatus'],
      [col('currency'), 'currency'],
      [fn('count', col('id')), 'n'],
      [fn('sum', col('cost_amount')), 'amount'],
    ],
    group: [col('cost_status'), col('currency')],
    raw: true,
  });

  const byCostStatus = {};
  const byCurrency = new Map();
  let deliveries = 0;
  for (const row of rows) {
    const n = Number(row.n);
    deliveries += n;
    byCostStatus[row.costStatus] = (byCostStatus[row.costStatus] || 0) + n;
    if (row.amount !== null && row.currency) {
      byCurrency.set(row.currency, (byCurrency.get(row.currency) || 0) + Number(row.amount));
    }
  }

  return {
    merchantId: merchant.id,
    merchantName: merchant.name,
    timeZone: merchant.timeZone,
    from,
    to,
    fromUtc,
    toUtc,
    deliveries,
    byCostStatus,
    totals: [...byCurrency.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, amount]) => ({ currency, amount })),
  };
}

async function courierStatusCounts(user, courierId) {
  const courier = await db.Courier.findByPk(courierId);
  if (!courier) throw new HttpError(404, 'NOT_FOUND', 'Mensajero no encontrado.');

  const rows = await db.Delivery.findAll({
    where: { courierId: courier.id, ...merchantFilter(user) },
    attributes: [
      [col('status'), 'status'],
      [fn('count', col('id')), 'n'],
    ],
    group: [col('status')],
    raw: true,
  });

  const counts = {};
  for (const row of rows) counts[row.status] = Number(row.n);
  return { courierId: courier.id, courierName: courier.name, counts };
}

// Fuera de alcance responde 404 igual que si no existiera: no confirma ids
// de otros comercios.
async function costAudit(user, deliveryId) {
  const delivery = await db.Delivery.findByPk(deliveryId);
  if (!delivery || !canAccessMerchant(user, delivery.merchantId)) {
    throw new HttpError(404, 'NOT_FOUND', 'Entrega no encontrada.');
  }
  const calculations = await db.CostCalculation.findAll({
    where: { deliveryId: delivery.id },
    order: [['id', 'DESC']],
    limit: 50,
  });

  return {
    delivery: {
      id: delivery.id,
      merchantId: delivery.merchantId,
      status: delivery.status,
      completedAt: delivery.completedAt,
      costStatus: delivery.costStatus,
      costAmount: delivery.costAmount,
      currency: delivery.currency,
    },
    calculations: calculations.map((c) => ({
      id: c.id,
      status: c.status,
      amount: c.amount,
      currency: c.currency,
      rulesVersion: c.rulesVersion,
      breakdown: c.breakdown,
      distanceMeters: c.distanceMeters,
      isNight: c.isNight,
      reason: c.reason,
      eventIds: c.eventIds,
      tariffId: c.tariffId,
      tariffSnapshot: c.tariffSnapshot,
      timeZone: c.timeZone,
      inputHash: c.inputHash,
      createdAt: c.createdAt,
    })),
  };
}

module.exports = { listMerchants, merchantTotals, courierStatusCounts, costAudit };
