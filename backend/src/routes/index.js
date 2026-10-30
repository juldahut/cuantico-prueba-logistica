'use strict';

const { Router } = require('express');
const healthRoutes = require('./health.routes');

const router = Router();

router.use('/health', healthRoutes);
// Siguientes fases: /auth, /events, /queries, /search, /agent

module.exports = router;
