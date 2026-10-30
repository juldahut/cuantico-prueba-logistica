'use strict';

const { Op } = require('sequelize');
const db = require('../models');
const { merchantFilter } = require('./scope');

const MAX_ROWS = 100;

async function listAnomalies(user, { code, state = 'open' } = {}) {
  const where = { ...merchantFilter(user) };
  if (code) where.code = code;
  if (state === 'open') where.resolvedAt = null;
  if (state === 'resolved') where.resolvedAt = { [Op.ne]: null };

  return db.Anomaly.findAll({
    where,
    attributes: [
      'id',
      'code',
      'deliveryId',
      'merchantId',
      'eventId',
      'detail',
      'resolvedAt',
      'createdAt',
    ],
    order: [['id', 'DESC']],
    limit: MAX_ROWS,
  });
}

module.exports = { listAnomalies };
