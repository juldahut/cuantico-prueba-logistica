'use strict';

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
