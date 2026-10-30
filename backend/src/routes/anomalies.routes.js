'use strict';

const { Router } = require('express');
const validate = require('../middlewares/validate');
const { anomaliesQuery } = require('../validators/event.validators');
const { getAnomalies } = require('../controllers/anomalies.controller');

const router = Router();

router.get('/', validate(anomaliesQuery, { status: 422 }), getAnomalies);

module.exports = router;
