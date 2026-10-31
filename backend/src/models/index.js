'use strict';

const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const { runtimeOptions } = require('../config/dbRuntime');
const config = require('../config/config.js')[env];

const databaseUrl = process.env[config.use_env_variable];

if (!databaseUrl) {
  throw new Error(
    `Falta ${config.use_env_variable}. Define esa variable de entorno (ver backend/.env.example) antes de iniciar la aplicación.`,
  );
}

// Pool y timeouts solo para el runtime (la CLI usa config.js sin ellos).
const sequelize = new Sequelize(databaseUrl, runtimeOptions(config));

const db = {};

fs.readdirSync(__dirname)
  .filter((file) => file !== basename && file.endsWith('.js'))
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

Object.values(db).forEach((model) => {
  if (model.associate) {
    model.associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
