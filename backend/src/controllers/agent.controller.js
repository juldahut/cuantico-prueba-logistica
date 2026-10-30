'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const HttpError = require('../errors/HttpError');
const { runAgent } = require('../agent/agent.service');
const { getProvider } = require('../agent/providers');

async function postChat(req, res) {
  const history = (req.body.history || []).map((h) => ({ role: h.role, content: h.content }));
  let result;
  try {
    result = await runAgent({
      user: req.user,
      message: req.body.message,
      history,
      provider: getProvider(),
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      throw new HttpError(502, 'AGENT_UNAVAILABLE', 'El asistente no esta disponible ahora.');
    }
    throw err;
  }
  return res.status(200).json(result);
}

module.exports = { postChat };
