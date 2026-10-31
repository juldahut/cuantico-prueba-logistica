'use strict';

const env = require('../../config/env');
const { createFakeProvider } = require('./fake');
const { createAnthropicProvider } = require('./anthropic');
const { createGeminiProvider } = require('./gemini');

let cached;

// Proveedor elegido por LLM_PROVIDER: "fake" (por defecto, sin llave),
// "anthropic" o "gemini". Todos hablan el mismo formato interno del agente.
function createProvider(config) {
  switch (config.llmProvider) {
    case 'anthropic':
      return createAnthropicProvider({
        apiKey: config.anthropicApiKey,
        model: config.anthropicModel,
        timeoutMs: config.llmTimeoutMs,
      });
    case 'gemini':
      return createGeminiProvider({
        apiKey: config.geminiApiKey,
        model: config.geminiModel,
        timeoutMs: config.llmTimeoutMs,
      });
    default:
      return createFakeProvider();
  }
}

function getProvider() {
  if (!cached) cached = createProvider(env);
  return cached;
}

module.exports = { getProvider, createProvider };
