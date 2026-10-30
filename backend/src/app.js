'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const env = require('./config/env');

const app = express();

app.use(cors({ origin: env.corsOrigin }));
// Limite explicito en vez de confiar en el default de Express.
app.use(express.json({ limit: '200kb' }));
app.use(helmet());
app.use(routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
