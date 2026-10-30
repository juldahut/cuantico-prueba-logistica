'use strict';

require('dotenv').config();

const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`API escuchando en el puerto ${env.port}`);
});
