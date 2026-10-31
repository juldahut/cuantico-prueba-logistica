'use strict';

// Limites bajos y limitadores encendidos ANTES de cargar la app (se leen al
// cargar los modulos). En tests estan apagados salvo con RATE_LIMIT_IN_TEST.
process.env.RATE_LIMIT_IN_TEST = 'true';
process.env.LLM_PROVIDER = 'fake';
process.env.READ_RPM = '3';
process.env.AGENT_RPM = '2';
process.env.INGEST_RPM = '3';

const request = require('supertest');
const app = require('../src/app');
const { accountKey } = require('../src/middlewares/rateLimiters');
const { sequelize, resetDb, createMerchant, createUser } = require('./helpers');

let opsA;
let opsB;
let opsC;
let ingestA;
let ingestB;

const chat = (user) =>
  request(app).post('/agent/chat').set(user.auth).send({ message: '¿Qué comercios puedo ver?' });
// Cuerpo invalido a proposito (422): el limitador corre antes de validar, asi se
// cuenta la peticion sin tocar la base.
const ingest = (user) => request(app).post('/events').set(user.auth).send({});

beforeAll(async () => {
  await resetDb();
  const { merchant } = await createMerchant();
  opsA = await createUser({ role: 'operaciones', merchantIds: [merchant.id] });
  opsB = await createUser({ role: 'operaciones', merchantIds: [merchant.id] });
  opsC = await createUser({ role: 'operaciones', merchantIds: [merchant.id] });
  ingestA = await createUser({ role: 'ingesta' });
  ingestB = await createUser({ role: 'ingesta' });
});

afterAll(async () => {
  await sequelize.close();
});

describe('limitador del agente: cupo por usuario (AGENT_RPM)', () => {
  it('corta al usuario que se pasa del cupo, sin tocar a otro usuario', async () => {
    expect((await chat(opsA)).status).toBe(200);
    expect((await chat(opsA)).status).toBe(200);

    const blocked = await chat(opsA);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.status).toBe(429);

    // Misma IP (supertest), otra cuenta: cupo propio.
    expect((await chat(opsB)).status).toBe(200);
    expect((await chat(opsB)).status).toBe(200);
    expect((await chat(opsB)).status).toBe(429);
  });
});

describe('limitador de ingesta: cupo por cuenta (INGEST_RPM)', () => {
  it('corta a la cuenta que se pasa del cupo, sin tocar a otra cuenta', async () => {
    for (let i = 0; i < 3; i += 1) expect((await ingest(ingestA)).status).toBe(422);
    expect((await ingest(ingestA)).status).toBe(429);

    expect((await ingest(ingestB)).status).toBe(422);
  });
});

describe('limitador de lectura: cupo por cuenta (READ_RPM)', () => {
  const read = (user, extra = {}) =>
    request(app)
      .get('/merchants')
      .set({ ...user.auth, ...extra });

  it('corta las lecturas de la cuenta que se pasa, sin tocar a otra', async () => {
    for (let i = 0; i < 3; i += 1) expect((await read(opsA)).status).toBe(200);
    expect((await read(opsA)).status).toBe(429);
    expect((await read(opsB)).status).toBe(200);
  });

  it('no se evade cambiando de IP declarada: la clave es la cuenta', async () => {
    const { body } = await request(app).get('/merchants').set(opsB.auth);
    expect(body).toBeDefined();
    // opsB ya uso 2 de 3; con otra IP declarada sigue siendo la misma cuenta.
    expect((await read(opsB, { 'X-Forwarded-For': '203.0.113.9' })).status).toBe(200);
    expect((await read(opsB, { 'X-Forwarded-For': '203.0.113.10' })).status).toBe(429);
  });

  it('el cupo de lectura no se comparte con el del agente', async () => {
    for (let i = 0; i < 3; i += 1) expect((await read(opsC)).status).toBe(200);
    expect((await read(opsC)).status).toBe(429);
    // La lectura esta agotada; el agente (cupo propio, aun sin usar) responde.
    expect((await chat(opsC)).status).toBe(200);
  });
});

describe('clave del limitador', () => {
  it('usa el id de la cuenta y cae a la IP si no hay cuenta', () => {
    expect(accountKey({ user: { id: 7 }, ip: '10.0.0.1' })).toBe('user:7');
    expect(accountKey({ user: { id: 8 }, ip: '10.0.0.1' })).not.toBe(
      accountKey({ user: { id: 7 }, ip: '10.0.0.1' }),
    );
    expect(accountKey({ ip: '10.0.0.1' })).toBe(accountKey({ ip: '10.0.0.1' }));
    expect(accountKey({ ip: '10.0.0.1' })).not.toBe(accountKey({ ip: '10.0.0.2' }));
    expect(accountKey({})).toEqual(expect.any(String));
  });

  it('agrupa las IPv6 de una misma subred (no se evade rotando la direccion)', () => {
    expect(accountKey({ ip: '2001:db8:1:2::1' })).toBe(accountKey({ ip: '2001:db8:1:2::ffff' }));
  });
});
