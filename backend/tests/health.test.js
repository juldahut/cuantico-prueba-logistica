'use strict';

/* global jest */

const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

afterAll(async () => {
  await sequelize.close();
});

describe('GET /health', () => {
  it('responde con el estado de la API y de la base de datos', async () => {
    const res = await request(app).get('/health');

    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('db');
  });
});

describe('errorHandler: base ocupada', () => {
  const errorHandler = require('../src/middlewares/errorHandler');
  const run = (err) => {
    const res = {
      statusCode: 200,
      headers: {},
      set(k, v) {
        this.headers[k] = v;
      },
      status(s) {
        this.code = s;
        return this;
      },
      json(b) {
        this.body = b;
      },
    };
    jest.spyOn(console, 'error').mockImplementation(() => {});
    errorHandler(err, {}, res, () => {});
    console.error.mockRestore();
    return res;
  };

  it.each(['55P03', '57014'])(
    'el codigo %s de Postgres responde 503 reintentable, sin detalles',
    (code) => {
      const res = run(Object.assign(new Error('SELECT secreto FROM tabla'), { parent: { code } }));
      expect(res.code).toBe(503);
      expect(res.headers['Retry-After']).toBe('2');
      expect(res.body.error).toMatchObject({ status: 503, code: 'DB_BUSY' });
      expect(JSON.stringify(res.body)).not.toMatch(/secreto|SELECT/);
    },
  );

  it('cualquier otro error inesperado sigue siendo un 500 generico', () => {
    const res = run(new Error('boom interno'));
    expect(res.code).toBe(500);
    expect(res.body.error.message).toBe('Error interno del servidor');
  });
});
