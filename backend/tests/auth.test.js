'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { db, sequelize, resetDb, createMerchant, createUser, TEST_PASSWORD } = require('./helpers');

let merchant;

beforeEach(async () => {
  await resetDb();
  ({ merchant } = await createMerchant());
});

afterAll(async () => {
  await sequelize.close();
});

describe('POST /auth/login', () => {
  it('devuelve un token y el alcance del usuario, sin el hash', async () => {
    await createUser({ role: 'operaciones', merchantIds: [merchant.id], email: 'ops@prueba.test' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'ops@prueba.test', password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({
      id: expect.any(Number),
      email: 'ops@prueba.test',
      role: 'operaciones',
      merchants: [{ id: merchant.id, name: merchant.name, timeZone: merchant.timeZone }],
    });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('clave incorrecta y correo inexistente responden igual (401)', async () => {
    await createUser({ role: 'admin', email: 'admin@prueba.test' });

    const wrong = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@prueba.test', password: 'no-es-la-clave' });
    const unknown = await request(app)
      .post('/auth/login')
      .send({ email: 'nadie@prueba.test', password: 'no-es-la-clave' });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it('valida el cuerpo', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: ['a@b.c'], password: 1 });
    expect(res.status).toBe(400);
  });

  it('rechaza claves de mas de 72 bytes (limite de bcrypt)', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'a@prueba.test', password: 'ñ'.repeat(37) });
    expect(res.status).toBe(400);
  });
});

describe('autenticacion en rutas protegidas', () => {
  const routes = [
    ['get', '/merchants'],
    ['get', '/anomalies'],
    ['get', '/search?q=tienda'],
    ['post', '/events'],
  ];

  it.each(routes)('%s %s sin token responde 401', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  it('rechaza tokens firmados con otra clave, sin firma o de usuarios borrados', async () => {
    const { user } = await createUser({ role: 'admin' });
    const forged = jwt.sign({ sub: user.id, role: 'admin' }, 'otra-clave');
    const unsigned = jwt.sign({ sub: user.id, role: 'admin' }, null, { algorithm: 'none' });

    for (const token of [forged, unsigned, 'basura']) {
      const res = await request(app).get('/merchants').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    }

    const { auth } = await createUser({ role: 'admin' });
    await db.User.destroy({ where: {} });
    expect((await request(app).get('/merchants').set(auth)).status).toBe(401);
  });

  it('el rol del token no se confia: se lee de la base de datos', async () => {
    const { user } = await createUser({ role: 'operaciones', merchantIds: [] });
    const escalated = jwt.sign({ sub: user.id, role: 'admin' }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
    });

    const res = await request(app).get('/merchants').set('Authorization', `Bearer ${escalated}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('autorizacion por rol', () => {
  it('operaciones no puede ingerir eventos', async () => {
    const { auth } = await createUser({ role: 'operaciones', merchantIds: [merchant.id] });
    const res = await request(app).post('/events').set(auth).send({});
    expect(res.status).toBe(403);
  });

  it('la cuenta de ingesta no puede consultar', async () => {
    const { auth } = await createUser({ role: 'ingesta' });
    expect((await request(app).get('/merchants').set(auth)).status).toBe(403);
    expect((await request(app).get('/search?q=tienda').set(auth)).status).toBe(403);
  });
});
