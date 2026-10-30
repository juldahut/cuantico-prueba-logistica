'use strict';

const { Router } = require('express');
const { getHealth } = require('../controllers/health.controller');

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Estado de la API y de la conexion a la base de datos
 *     security: []
 *     responses:
 *       200:
 *         description: Todo conectado
 *       503:
 *         description: La base de datos no responde
 */
router.get('/', getHealth);

module.exports = router;
