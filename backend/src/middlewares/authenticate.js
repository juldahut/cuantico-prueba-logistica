'use strict';

const HttpError = require('../errors/HttpError');
const { principalFromToken } = require('../services/auth.service');

// Valida el JWT y carga rol y alcance desde la base de datos en req.user.
async function authenticate(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Se requiere autenticacion.');
  }
  const principal = await principalFromToken(token);
  if (!principal) {
    throw new HttpError(401, 'UNAUTHENTICATED', 'Token invalido o expirado.');
  }
  req.user = principal;
  return next();
}

module.exports = authenticate;
