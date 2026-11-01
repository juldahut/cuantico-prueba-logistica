'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const env = require('../config/env');
const HttpError = require('../errors/HttpError');

const BCRYPT_COST = 10;
let dummyHash;

function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_COST);
}

// El token solo lleva el id: rol y alcance se leen de la base en cada
// peticion, asi un cambio de permisos aplica de inmediato.
function issueToken(user) {
  return jwt.sign({ sub: String(user.id) }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresIn,
  });
}

async function loadPrincipal(userId) {
  const user = await db.User.findByPk(userId, {
    include: [{ model: db.Merchant, as: 'merchants', attributes: ['id', 'name', 'timeZone'] }],
  });
  if (!user) return null;

  const merchants =
    user.role === 'admin'
      ? await db.Merchant.findAll({
          attributes: ['id', 'name', 'timeZone'],
          order: [['name', 'ASC']],
        })
      : [...user.merchants].sort((a, b) => a.name.localeCompare(b.name));

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    // null = sin restriccion (admin). Un arreglo vacio no da acceso a nada.
    merchantIds: user.role === 'admin' ? null : user.merchants.map((m) => m.id),
    merchants: merchants.map((m) => ({ id: m.id, name: m.name, timeZone: m.timeZone })),
  };
}

async function principalFromToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
  const userId = Number(payload.sub);
  if (!Number.isSafeInteger(userId)) return null;
  return loadPrincipal(userId);
}

function publicUser(principal) {
  return {
    id: principal.id,
    email: principal.email,
    role: principal.role,
    merchants: principal.merchants,
  };
}

// Mismo mensaje y mismo costo (bcrypt contra un hash de relleno) para correo
// inexistente y clave incorrecta: no se pueden enumerar usuarios.
async function login(email, password) {
  const user = await db.User.scope('withPassword').findOne({
    where: { email: email.trim().toLowerCase() },
  });
  if (!dummyHash) dummyHash = await hashPassword('relleno-para-igualar-tiempos');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : dummyHash);
  if (!user || !ok) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Correo o clave incorrectos.');
  }
  const principal = await loadPrincipal(user.id);
  return { token: issueToken(user), user: publicUser(principal) };
}

module.exports = { hashPassword, issueToken, principalFromToken, login, publicUser };
