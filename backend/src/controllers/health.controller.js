'use strict';

const { sequelize } = require('../models');

async function getHealth(req, res) {
  try {
    await sequelize.authenticate();
    return res.status(200).json({ status: 'ok', db: 'ok' });
  } catch {
    return res.status(503).json({ status: 'error', db: 'error' });
  }
}

module.exports = { getHealth };
