'use strict';

const env = require('../../config/env');
const { createFakeProvider } = require('./fake');
const { createAnthropicProvider } = require('./anthropic');
const { createGeminiProvider } = require('./gemini');
const { createCompatibleProvider } = require('./compatible');

let cached;

// Proveedor elegido por LLM_PROVIDER: "fake" (por defecto, sin llave),
// "anthropic", "gemini" o uno compatible con la API de OpenAI: "groq" (capa
// gratuita), "ollama" (modelo local, sin cuota) y "compatible" (cualquier otra
// URL). Todos hablan el mismo formato interno del agente.
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
    case 'groq':
      return createCompatibleProvider({
        name: 'groq',
        apiKey: config.groqApiKey,
        requireKey: true,
        baseUrl: 'https://api.groq.com/openai/v1',
        model: config.groqModel || 'llama-3.3-70b-versatile',
        timeoutMs: config.llmTimeoutMs,
      });
    case 'ollama':
      // Dentro de Docker, host.docker.internal es la maquina que corre Ollama.
      return createCompatibleProvider({
        name: 'ollama',
        baseUrl: config.ollamaBaseUrl || 'http://host.docker.internal:11434/v1',
        model: config.ollamaModel || 'qwen2.5:7b',
        timeoutMs: config.llmTimeoutMs,
      });
    case 'compatible':
      return createCompatibleProvider({
        name: 'compatible',
        apiKey: config.llmApiKey,
        baseUrl: config.llmBaseUrl,
        model: config.llmModel,
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
