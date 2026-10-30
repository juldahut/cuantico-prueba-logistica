'use strict';

const { Op } = require('sequelize');

// El alcance sale siempre de la sesion (req.user), nunca del cliente ni del
// modelo de lenguaje.
function canAccessMerchant(user, merchantId) {
  return user.merchantIds === null || user.merchantIds.includes(Number(merchantId));
}

// Filtro para consultas sobre tablas con merchant_id.
function merchantFilter(user) {
  return user.merchantIds === null ? {} : { merchantId: { [Op.in]: user.merchantIds } };
}

module.exports = { canAccessMerchant, merchantFilter };
