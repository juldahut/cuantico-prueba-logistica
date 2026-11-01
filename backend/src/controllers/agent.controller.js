'use strict';

const HttpError = require('../errors/HttpError');
const { runAgent } = require('../agent/agent.service');
const { getProvider } = require('../agent/providers');

async function postChat(req, res) {
  const history = (req.body.history || []).map((h) => ({ role: h.role, content: h.content }));
  const provider = getProvider();
  let result;
  try {
    result = await runAgent({
      user: req.user,
      message: req.body.message,
      history,
      provider,
    });
  } catch (err) {
    // Cada proveedor sabe reconocer los errores de su API (caida, cuota,
    // llave invalida): se responden como 502 sin detalles internos.
    if (provider.isProviderError?.(err)) {
      // Cuota o limite de uso del proveedor (el nivel gratuito es muy bajo): se
      // dice con claridad, porque reintentar de inmediato no sirve.
      if (err.status === 429) {
        throw new HttpError(
          429,
          'AGENT_QUOTA',
          'El proveedor de IA alcanzó su límite de uso. Espera un momento (o usa una llave con más cupo) y vuelve a intentar.',
        );
      }
      throw new HttpError(502, 'AGENT_UNAVAILABLE', 'El asistente no está disponible ahora.', {
        expose: true,
      });
    }
    throw err;
  }
  return res.status(200).json(result);
}

module.exports = { postChat };
