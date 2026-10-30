'use strict';

require('dotenv').config({ quiet: true });

const app = require('./app');
const env = require('./config/env');

app.listen(env.port, () => {
  console.log(`API escuchando en el puerto ${env.port}`);
});
