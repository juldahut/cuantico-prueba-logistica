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
      throw new HttpError(502, 'AGENT_UNAVAILABLE', 'El asistente no esta disponible ahora.');
    }
    throw err;
  }
  return res.status(200).json(result);
}

module.exports = { postChat };
