'use strict';

const { listAnomalies } = require('../services/anomalies.service');

async function getAnomalies(req, res) {
  const data = await listAnomalies(req.user, { code: req.query.code, state: req.query.state });
  return res.status(200).json({ data });
}

module.exports = { getAnomalies };
