'use strict';

const { ingestEvent } = require('../services/ingestion.service');

async function postEvent(req, res) {
  const { status, body } = await ingestEvent(req.body);
  return res.status(status).json(body);
}

module.exports = { postEvent };
