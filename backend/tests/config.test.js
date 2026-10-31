'use strict';

/* global jest */

const { QueryTypes } = require('sequelize');

const ORIGINAL_ENV = { ...process.env };

const NEW_VARS = [
  'INGEST_RPM',
  'AGENT_RPM',
  'TRUST_PROXY',
  'LLM_TIMEOUT_MS',
  'DB_POOL_MAX',
  'DB_STATEMENT_TIMEOUT_MS',
  'DB_LOCK_TIMEOUT_MS',
  'DB_IDLE_IN_TX_TIMEOUT_MS',
];

// Carga el modulo desde cero con las variables dadas. Las demas variables
// nuevas quedan sin definir para que el .env local no altere el resultado.
function loadFresh(modulePath, vars = {}) {
  for (const name of NEW_VARS) delete process.env[name];
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);
  Object.assign(process.env, vars);
  let loaded;
  jest.isolateModules(() => {
    loaded = require(modulePath);
  });
  return loaded;
}

afterAll(async () => {
  await require('./helpers').sequelize.close();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('config/env: limites y timeouts por entorno', () => {
  it('sin variables usa los valores por defecto', () => {
    const env = loadFresh('../src/config/env');
    expect(env).toMatchObject({
      ingestRpm: 600,
      agentRpm: 20,
      llmTimeoutMs: 30000,
      trustProxy: null,
    });
  });

  it('una variable vacia cuenta como sin definir (asi llega desde docker compose)', () => {
    const env = loadFresh('../src/config/env', {
      INGEST_RPM: '',
      AGENT_RPM: '  ',
      TRUST_PROXY: '',
      LLM_TIMEOUT_MS: '',
    });
    expect(env).toMatchObject({
      ingestRpm: 600,
      agentRpm: 20,
      llmTimeoutMs: 30000,
      trustProxy: null,
    });
  });

  it('lee valores validos', () => {
    const env = loadFresh('../src/config/env', {
      INGEST_RPM: '6000',
      AGENT_RPM: '5',
      LLM_TIMEOUT_MS: '45000',
      TRUST_PROXY: '2',
    });
    expect(env).toMatchObject({
      ingestRpm: 6000,
      agentRpm: 5,
      llmTimeoutMs: 45000,
      trustProxy: 2,
    });
  });

  it.each([
    ['INGEST_RPM', '0'],
    ['INGEST_RPM', '-5'],
    ['INGEST_RPM', 'muchas'],
    ['INGEST_RPM', '1.5'],
    ['INGEST_RPM', '1e3'],
    ['AGENT_RPM', '0'],
    ['AGENT_RPM', 'NaN'],
    ['LLM_TIMEOUT_MS', '0'],
    ['LLM_TIMEOUT_MS', '30s'],
    ['TRUST_PROXY', '-1'],
    ['TRUST_PROXY', 'true'],
    ['TRUST_PROXY', '99'],
  ])('%s=%s hace fallar el arranque con un mensaje claro', (name, value) => {
    expect(() => loadFresh('../src/config/env', { [name]: value })).toThrow(
      new RegExp(`^${name} debe ser un entero entre`),
    );
  });
});

describe('config/dbRuntime: pool y timeouts de PostgreSQL', () => {
  const base = { dialect: 'postgres', logging: false };

  it('por defecto: pool de 10, acquire 10 s y timeouts 15000/5000/15000', () => {
    const { runtimeOptions } = loadFresh('../src/config/dbRuntime');
    const options = runtimeOptions(base);
    expect(options).toMatchObject({
      dialect: 'postgres',
      logging: false,
      pool: { max: 10, acquire: 10000 },
      dialectOptions: {
        statement_timeout: 15000,
        lock_timeout: 5000,
        idle_in_transaction_session_timeout: 15000,
      },
    });
  });

  it('se configura por variables', () => {
    const { runtimeOptions } = loadFresh('../src/config/dbRuntime', {
      DB_POOL_MAX: '25',
      DB_STATEMENT_TIMEOUT_MS: '60000',
      DB_LOCK_TIMEOUT_MS: '1000',
      DB_IDLE_IN_TX_TIMEOUT_MS: '2000',
    });
    const options = runtimeOptions(base);
    expect(options.pool).toEqual({ max: 25, acquire: 10000 });
    expect(options.dialectOptions).toEqual({
      statement_timeout: 60000,
      lock_timeout: 1000,
      idle_in_transaction_session_timeout: 2000,
    });
  });

  it.each([
    'DB_POOL_MAX',
    'DB_STATEMENT_TIMEOUT_MS',
    'DB_LOCK_TIMEOUT_MS',
    'DB_IDLE_IN_TX_TIMEOUT_MS',
  ])('%s invalida hace fallar el arranque', (name) => {
    const { runtimeOptions } = loadFresh('../src/config/dbRuntime', { [name]: 'abc' });
    expect(() => runtimeOptions(base)).toThrow(new RegExp(`^${name} debe ser un entero entre`));
  });

  it('la configuracion de sequelize-cli no lleva timeouts (migraciones y seeders)', () => {
    const config = require('../src/config/config');
    for (const name of ['development', 'test', 'production']) {
      expect(config[name].dialectOptions).toBeUndefined();
      expect(config[name].pool).toBeUndefined();
    }
  });

  it('la conexion de la API aplica los timeouts en PostgreSQL', async () => {
    const { sequelize } = require('./helpers');
    const show = async (name) => {
      const [row] = await sequelize.query(`SHOW ${name}`, { type: QueryTypes.SELECT });
      return row[name];
    };
    expect(await show('statement_timeout')).toBe('15s');
    expect(await show('lock_timeout')).toBe('5s');
    expect(await show('idle_in_transaction_session_timeout')).toBe('15s');
    expect(sequelize.options.pool).toMatchObject({ max: 10, acquire: 10000 });
  });
});

describe('app: trust proxy', () => {
  it('sin TRUST_PROXY no confia en el proxy', () => {
    const app = loadFresh('../src/app');
    expect(app.get('trust proxy')).toBe(false);
  });

  it('con TRUST_PROXY=n confia en n saltos', () => {
    const app = loadFresh('../src/app', { TRUST_PROXY: '1' });
    expect(app.get('trust proxy')).toBe(1);
  });
});
