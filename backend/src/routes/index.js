'use strict';

const { Router } = require('express');
const healthRoutes = require('./health.routes');
const eventsRoutes = require('./events.routes');
const anomaliesRoutes = require('./anomalies.routes');

const router = Router();

router.use('/health', healthRoutes);
router.use('/events', eventsRoutes);
router.use('/anomalies', anomaliesRoutes);
// Siguientes fases: /auth, /queries, /search, /agent

module.exports = router;
