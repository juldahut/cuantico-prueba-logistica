'use strict';

const { Op } = require('sequelize');
const db = require('../models');
const { merchantFilter } = require('./scope');

const MAX_ROWS = 20;

// En LIKE, % y _ son comodines y \ es el escape por defecto de PostgreSQL:
// se escapan para que el texto del usuario se busque literal.
function escapeLike(text) {
  return text.replace(/[\\%_]/g, (c) => '\\' + c);
}

// Busqueda por comercio, direccion o mensajero. El ORM envia el patron como
// valor escapado; nunca se concatena texto del usuario en el SQL.
async function searchDeliveries(user, q) {
  const pattern = `%${escapeLike(q.trim())}%`;
  const rows = await db.Delivery.findAll({
    where: {
      ...merchantFilter(user),
      [Op.or]: [
        { '$merchant.name$': { [Op.iLike]: pattern } },
        { address: { [Op.iLike]: pattern } },
        { '$courier.name$': { [Op.iLike]: pattern } },
      ],
    },
    include: [
      { model: db.Merchant, as: 'merchant', attributes: ['id', 'name'] },
      { model: db.Courier, as: 'courier', attributes: ['name'], required: false },
    ],
    order: [['id', 'ASC']],
    limit: MAX_ROWS,
    subQuery: false,
  });

  return {
    data: rows.map((d) => ({
      deliveryId: d.id,
      merchantId: d.merchant.id,
      merchantName: d.merchant.name,
      address: d.address,
      courierName: d.courier ? d.courier.name : null,
      status: d.status,
      costAmount: d.costAmount,
      currency: d.currency,
    })),
    limit: MAX_ROWS,
  };
}

module.exports = { searchDeliveries, escapeLike, MAX_ROWS };
