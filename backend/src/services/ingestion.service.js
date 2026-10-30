'use strict';

const crypto = require('crypto');
const { Op } = require('sequelize');
const db = require('../models');
const HttpError = require('../errors/HttpError');
const { calculateDeliveryCost, normalizeEvents, EVENT_TYPES } = require('../domain');

const { sequelize } = db;
const RULES_VERSION = 'v1';
const RANK = new Map(EVENT_TYPES.map((type, i) => [type, i]));
// Anomalias que dependen del calculo vigente: se abren y se resuelven solas.
const CALCULATION_ANOMALIES = ['MISSING_PICKUP', 'BOTH_TERMINAL'];

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

// Solo campos conocidos, en orden fijo y con el instante normalizado a UTC:
// el hash no depende del orden de las llaves ni del offset con que llego.
function toPayload(body) {
  const payload = {
    eventId: body.eventId,
    deliveryId: body.deliveryId,
    merchantId: Number(body.merchantId),
    type: body.type,
    occurredAt: new Date(body.occurredAt).toISOString(),
  };
  if (body.location !== undefined) {
    payload.location = { lat: body.location.lat, lon: body.location.lon };
  }
  if (body.courierId !== undefined) payload.courierId = Number(body.courierId);
  if (body.address !== undefined) payload.address = body.address;
  return payload;
}

function toDomainEvent(payload) {
  const event = {
    eventId: payload.eventId,
    deliveryId: payload.deliveryId,
    type: payload.type,
    occurredAt: payload.occurredAt,
  };
  if (payload.location) event.location = payload.location;
  return event;
}

async function recordAnomalies(rows, transaction) {
  if (rows.length === 0) return;
  await db.Anomaly.bulkCreate(rows, { ignoreDuplicates: true, transaction });
}

// Estado del ciclo de vida segun los eventos ordenados por occurredAt.
function projectStatus(ordered) {
  const delivered = ordered.findLast((e) => e.type === 'entregada');
  const failed = ordered.findLast((e) => e.type === 'fallida');
  if (delivered && failed) return { status: 'inconsistente', terminal: delivered };
  if (delivered) return { status: 'entregada', terminal: delivered };
  if (failed) return { status: 'fallida', terminal: failed };
  return { status: ordered.at(-1).type, terminal: null };
}

// Un evento con etapa anterior a otra ya ocurrida (p. ej. en_ruta despues de
// entregada) no se rechaza: llego y paso. Se deja visible para operaciones.
function transitionAnomalies(ordered, delivery) {
  const rows = [];
  let maxRank = -1;
  for (const event of ordered) {
    const rank = RANK.get(event.type);
    if (rank < maxRank) {
      rows.push({
        code: 'INVALID_TRANSITION',
        deliveryId: delivery.id,
        merchantId: delivery.merchantId,
        eventId: event.eventId,
        detail: { type: event.type, occurredAt: event.occurredAt },
        dedupKey: `INVALID_TRANSITION:${delivery.id}:${event.eventId}`,
      });
    }
    maxRank = Math.max(maxRank, rank);
  }
  return rows;
}

async function findTariff(merchantId, instant, transaction) {
  return db.Tariff.findOne({
    where: {
      merchantId,
      validFrom: { [Op.lte]: instant },
      [Op.or]: [{ validTo: null }, { validTo: { [Op.gt]: instant } }],
    },
    order: [['validFrom', 'DESC']],
    transaction,
  });
}

// Recalcula desde TODOS los eventos guardados de la entrega. Corre dentro de
// la transaccion que tiene bloqueada la fila de la entrega.
async function recalculate(delivery, merchant, transaction) {
  const stored = await db.DeliveryEvent.findAll({
    where: { deliveryId: delivery.id },
    transaction,
  });
  const payloads = stored.map((row) => row.payload);
  const ordered = normalizeEvents(payloads.map(toDomainEvent));
  const byId = new Map(payloads.map((p) => [p.eventId, p]));

  const { status, terminal } = projectStatus(ordered);
  const withAddress = ordered.findLast((e) => byId.get(e.eventId).address !== undefined);
  const withCourier = ordered.findLast((e) => byId.get(e.eventId).courierId !== undefined);

  delivery.status = status;
  delivery.completedAt = terminal ? terminal.occurredAt : null;
  delivery.address = withAddress ? byId.get(withAddress.eventId).address : null;
  delivery.courierId = withCourier ? byId.get(withCourier.eventId).courierId : null;

  const anomalies = transitionAnomalies(ordered, delivery);
  const tariffInstant = terminal ? terminal.occurredAt : ordered.at(-1).occurredAt;
  const tariff = await findTariff(delivery.merchantId, tariffInstant, transaction);

  if (!tariff) {
    delivery.costStatus = 'no_tariff';
    delivery.costAmount = null;
    delivery.currency = null;
    if (terminal) {
      anomalies.push({
        code: 'NO_TARIFF',
        deliveryId: delivery.id,
        merchantId: delivery.merchantId,
        detail: { instant: tariffInstant },
        dedupKey: `NO_TARIFF:${delivery.id}`,
      });
    }
    await recordAnomalies(anomalies, transaction);
    await delivery.save({ transaction });
    return;
  }

  const tariffSnapshot = {
    baseAmount: tariff.baseAmount,
    perKmAmount: tariff.perKmAmount,
    currency: tariff.currency,
  };
  const result = calculateDeliveryCost({
    events: payloads.map(toDomainEvent),
    tariff: tariffSnapshot,
    timeZone: merchant.timeZone,
    rulesVersion: RULES_VERSION,
  });

  const inputHash = sha256({
    rulesVersion: RULES_VERSION,
    timeZone: merchant.timeZone,
    tariff: { id: tariff.id, ...tariffSnapshot },
    events: stored.map((row) => row.payloadHash).sort(),
  });
  const latest = await db.CostCalculation.findOne({
    where: { deliveryId: delivery.id },
    order: [['id', 'DESC']],
    transaction,
  });
  if (!latest || latest.inputHash !== inputHash) {
    await db.CostCalculation.create(
      {
        deliveryId: delivery.id,
        status: result.status,
        amount: result.amount,
        currency: result.currency,
        rulesVersion: result.rulesVersion,
        breakdown: result.breakdown,
        distanceMeters: result.distanceMeters,
        isNight: result.isNight,
        reason: result.reason,
        eventIds: result.eventIdsUsed,
        tariffId: tariff.id,
        tariffSnapshot,
        timeZone: merchant.timeZone,
        inputHash,
      },
      { transaction },
    );
  }

  for (const code of CALCULATION_ANOMALIES) {
    const dedupKey = `${code}:${delivery.id}`;
    if (result.reason === code) {
      anomalies.push({ code, deliveryId: delivery.id, merchantId: delivery.merchantId, dedupKey });
    } else {
      await db.Anomaly.update(
        { resolvedAt: new Date() },
        { where: { dedupKey, resolvedAt: null }, transaction },
      );
    }
  }
  await recordAnomalies(anomalies, transaction);

  delivery.costStatus = result.status;
  delivery.costAmount = result.amount;
  delivery.currency = result.currency;
  await delivery.save({ transaction });
}

function summary(delivery) {
  return {
    status: delivery.status,
    costStatus: delivery.costStatus,
    costAmount: delivery.costAmount,
    currency: delivery.currency,
  };
}

// Ingesta idempotente: se inserta primero y la restriccion unica de event_id
// decide si es nuevo. Mismo id y mismo contenido -> sin efecto; contenido
// distinto -> 409 y anomalia visible.
async function ingestEvent(body) {
  const payload = toPayload(body);
  const payloadHash = sha256(payload);

  const merchant = await db.Merchant.findByPk(payload.merchantId);
  if (!merchant) throw new HttpError(422, 'UNKNOWN_MERCHANT', 'El comercio no existe.');
  if (payload.courierId !== undefined && !(await db.Courier.findByPk(payload.courierId))) {
    throw new HttpError(422, 'UNKNOWN_COURIER', 'El mensajero no existe.');
  }

  // La anomalia de un rechazo se guarda despues del rollback, fuera de la
  // transaccion, para que no se pierda con ella.
  let rejection = null;

  try {
    return await sequelize.transaction(async (transaction) => {
      await sequelize.query(
        `INSERT INTO deliveries (id, merchant_id, status, created_at, updated_at)
         VALUES ($id, $merchantId, $status, now(), now())
         ON CONFLICT (id) DO NOTHING`,
        {
          // bind: parametros del lado del servidor ($1, $2...), nunca texto concatenado.
          bind: {
            id: payload.deliveryId,
            merchantId: payload.merchantId,
            status: payload.type,
          },
          transaction,
        },
      );
      // Bloqueo por entrega: los eventos de una misma entrega se procesan de a
      // uno; entregas distintas no se bloquean entre si.
      const delivery = await db.Delivery.findByPk(payload.deliveryId, {
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (delivery.merchantId !== payload.merchantId) {
        rejection = {
          code: 'MERCHANT_MISMATCH',
          deliveryId: delivery.id,
          merchantId: delivery.merchantId,
          eventId: payload.eventId,
          detail: { receivedMerchantId: payload.merchantId },
          dedupKey: `MERCHANT_MISMATCH:${payload.eventId}:${payloadHash}`,
        };
        throw new HttpError(409, 'MERCHANT_MISMATCH', 'La entrega pertenece a otro comercio.');
      }

      const [inserted] = await sequelize.query(
        `INSERT INTO delivery_events
           (event_id, delivery_id, merchant_id, type, occurred_at, payload, payload_hash, received_at)
         VALUES ($eventId, $deliveryId, $merchantId, $type, $occurredAt, $payload, $payloadHash, now())
         ON CONFLICT (event_id) DO NOTHING
         RETURNING id`,
        {
          bind: {
            eventId: payload.eventId,
            deliveryId: payload.deliveryId,
            merchantId: payload.merchantId,
            type: payload.type,
            occurredAt: payload.occurredAt,
            payload: JSON.stringify(payload),
            payloadHash,
          },
          transaction,
        },
      );

      if (inserted.length === 0) {
        const existing = await db.DeliveryEvent.findOne({
          where: { eventId: payload.eventId },
          transaction,
        });
        if (existing.payloadHash === payloadHash) {
          return {
            status: 200,
            body: {
              eventId: payload.eventId,
              deliveryId: payload.deliveryId,
              duplicate: true,
              delivery: summary(delivery),
            },
          };
        }
        rejection = {
          code: 'EVENT_CONFLICT',
          deliveryId: existing.deliveryId,
          merchantId: existing.merchantId,
          eventId: payload.eventId,
          detail: { storedHash: existing.payloadHash, receivedHash: payloadHash },
          dedupKey: `EVENT_CONFLICT:${payload.eventId}:${payloadHash}`,
        };
        throw new HttpError(409, 'EVENT_CONFLICT', 'El eventId ya existe con contenido distinto.');
      }

      await recalculate(delivery, merchant, transaction);

      return {
        status: 201,
        body: {
          eventId: payload.eventId,
          deliveryId: payload.deliveryId,
          duplicate: false,
          delivery: summary(delivery),
        },
      };
    });
  } catch (err) {
    if (rejection) await recordAnomalies([rejection]);
    throw err;
  }
}

module.exports = { ingestEvent, recalculate, toPayload };
