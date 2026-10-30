'use strict';

const env = require('../../config/env');
const { createFakeProvider } = require('./fake');
const { createAnthropicProvider } = require('./anthropic');

let cached;

// Proveedor elegido por LLM_PROVIDER: "fake" (por defecto, sin llave) o
// "anthropic".
function getProvider() {
  if (!cached) {
    cached =
      env.llmProvider === 'anthropic'
        ? createAnthropicProvider({ apiKey: env.anthropicApiKey, model: env.anthropicModel })
        : createFakeProvider();
  }
  return cached;
}

module.exports = { getProvider };
