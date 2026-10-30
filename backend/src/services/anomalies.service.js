'use strict';

const db = require('../models');

const MAX_ROWS = 100;

async function listAnomalies({ code, state = 'open' } = {}) {
  const where = {};
  if (code) where.code = code;
  if (state === 'open') where.resolvedAt = null;
  if (state === 'resolved') where.resolvedAt = { [db.Sequelize.Op.ne]: null };

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
