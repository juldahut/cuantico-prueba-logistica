'use strict';

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403);
      return next(new Error('No tienes permisos para realizar esta accion.'));
    }

    return next();
  };
}

module.exports = authorizeRoles;
