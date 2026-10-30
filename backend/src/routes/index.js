'use strict';

const { Router } = require('express');
const authenticate = require('../middlewares/authenticate');
const authorizeRoles = require('../middlewares/authorizeRoles');
const validate = require('../middlewares/validate');
const { authLimiter, agentLimiter } = require('../middlewares/rateLimiters');
const v = require('../validators/query.validators');
const c = require('../controllers/queries.controller');
const { chatBody } = require('../validators/agent.validators');
const { postChat } = require('../controllers/agent.controller');
const healthRoutes = require('./health.routes');
const eventsRoutes = require('./events.routes');
const anomaliesRoutes = require('./anomalies.routes');

const router = Router();

// Consultas: solo personas (admin y operaciones). La cuenta de ingesta no lee.
const reader = [authenticate, authorizeRoles('admin', 'operaciones')];

router.use('/health', healthRoutes);
router.post('/auth/login', authLimiter, validate(v.loginBody), c.postLogin);

router.use('/events', authenticate, authorizeRoles('ingesta', 'admin'), eventsRoutes);
router.use('/anomalies', ...reader, anomaliesRoutes);

router.get('/merchants', ...reader, c.getMerchants);
router.get(
  '/merchants/:id/totals',
  ...reader,
  validate(v.totalsQuery, { status: 422 }),
  c.getMerchantTotals,
);
router.get(
  '/couriers/:id/status-counts',
  ...reader,
  validate(v.courierIdParam, { status: 422 }),
  c.getCourierStatusCounts,
);
router.get(
  '/deliveries/:id/cost-audit',
  ...reader,
  validate(v.deliveryIdParam, { status: 422 }),
  c.getCostAudit,
);
router.get('/search', ...reader, validate(v.searchQuery, { status: 422 }), c.getSearch);
router.post('/agent/chat', ...reader, agentLimiter, validate(chatBody, { status: 422 }), postChat);

module.exports = router;
