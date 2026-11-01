'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const DEFAULT_MODEL = 'claude-opus-5-5';

// Proveedor real. La llave sale de ANTHROPIC_API_KEY (nunca del codigo). Si el
// modelo declina por sus salvaguardas, la API reintenta en un modelo de
// respaldo (fallbacks: "default"); si igual declina, llega stop_reason
// "refusal" y el agente responde un mensaje generico.
// `timeoutMs` (LLM_TIMEOUT_MS) es por intento; el SDK reintenta 2 veces.
function createAnthropicProvider({ apiKey, model, timeoutMs }) {
  if (!apiKey) {
    throw new Error('LLM_PROVIDER=anthropic requiere ANTHROPIC_API_KEY.');
  }
  const client = new Anthropic({ apiKey, timeout: timeoutMs || 30000, maxRetries: 2 });
  const modelId = model || DEFAULT_MODEL;

  return {
    name: 'anthropic',
    model: modelId,
    // El timeout llega como APIConnectionTimeoutError, subclase de APIError.
    isProviderError: (err) => err instanceof Anthropic.APIError,
    async createMessage({ system, messages, tools }) {
      return client.beta.messages.create({
        model: modelId,
        max_tokens: 4096,
        system,
        messages,
        // strict: las entradas de las tools respetan el esquema. Igual se
        // validan en el servidor (tools.js).
        tools: tools.map((t) => ({ ...t, strict: true })),
        tool_choice: { type: 'auto' },
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });
    },
  };
}

module.exports = { createAnthropicProvider, DEFAULT_MODEL };
