'use strict';

const { Router } = require('express');
const validate = require('../middlewares/validate');
const { eventBody } = require('../validators/event.validators');
const { postEvent } = require('../controllers/events.controller');

const router = Router();

router.post('/', validate(eventBody, { status: 422 }), postEvent);

module.exports = router;
