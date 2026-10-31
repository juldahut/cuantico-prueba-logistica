'use strict';

const { GoogleGenAI, ApiError } = require('@google/genai');

// Version fija (no un alias movil): el comportamiento con las tools no cambia
// sin aviso. Se puede elegir otra con GEMINI_MODEL.
const DEFAULT_MODEL = 'gemini-2.5-flash';

const REFUSAL_REASONS = new Set([
  'SAFETY',
  'RECITATION',
  'BLOCKLIST',
  'PROHIBITED_CONTENT',
  'SPII',
  'IMAGE_SAFETY',
]);

let counter = 0;
const newCallId = () => {
  counter += 1;
  return `gemini_call_${Date.now().toString(36)}_${counter}`;
};

// --- Del formato interno del agente (bloques text / tool_use / tool_result) a
// contents de Gemini. El agente no sabe de Gemini: la traduccion vive aqui.

function toolNames(messages) {
  const byId = new Map();
  for (const m of messages) {
    if (m.role !== 'assistant' || !Array.isArray(m.content)) continue;
    for (const b of m.content) {
      if (b.type === 'tool_use') byId.set(b.id, { name: b.name, callId: b._geminiCallId });
    }
  }
  return byId;
}

function toContents(messages) {
  const calls = toolNames(messages);
  return messages.map((m) => {
    if (m.role === 'assistant') {
      // El turno del modelo se reenvia tal cual llego (incluye thoughtSignature,
      // que Gemini exige para continuar despues de un functionCall).
      const raw = m.content.find((b) => b._gemini)?._gemini;
      if (raw) return raw;
      return {
        role: 'model',
        parts: m.content.map((b) =>
          b.type === 'tool_use'
            ? { functionCall: { name: b.name, args: b.input } }
            : { text: b.text },
        ),
      };
    }
    if (typeof m.content === 'string') return { role: 'user', parts: [{ text: m.content }] };
    return {
      role: 'user',
      parts: m.content.map((b) => {
        if (b.type !== 'tool_result') return { text: b.text };
        const call = calls.get(b.tool_use_id);
        // Cada resultado debe corresponder a una llamada conocida: nunca se
        // responde con el nombre de otra tool.
        if (!call) throw new Error('tool_result sin functionCall correspondiente');
        const data = JSON.parse(b.content ?? 'null');
        return {
          functionResponse: {
            ...(call.callId ? { id: call.callId } : {}),
            name: call.name,
            response: b.is_error ? { error: data } : { output: data },
          },
        };
      }),
    };
  });
}

// --- De la respuesta de Gemini al formato interno del agente.

function fromResponse(raw) {
  const candidate = raw.candidates?.[0];
  const content = candidate?.content || { role: 'model', parts: [] };
  const blocks = [];
  for (const part of content.parts || []) {
    if (part.functionCall) {
      blocks.push({
        type: 'tool_use',
        // Id interno siempre propio: si Gemini repite un id en otro turno, no
        // choca. El id de Gemini se guarda aparte para la functionResponse.
        id: newCallId(),
        name: part.functionCall.name,
        input: part.functionCall.args || {},
        _geminiCallId: part.functionCall.id,
      });
    } else if (typeof part.text === 'string' && !part.thought) {
      // Los pensamientos (thought: true) no son texto de la respuesta.
      blocks.push({ type: 'text', text: part.text });
    }
  }
  if (blocks.length > 0) blocks[0]._gemini = { role: 'model', parts: content.parts || [] };

  let stopReason = 'end_turn';
  if (raw.promptFeedback?.blockReason || REFUSAL_REASONS.has(candidate?.finishReason)) {
    stopReason = 'refusal';
  } else if (blocks.some((b) => b.type === 'tool_use')) {
    stopReason = 'tool_use';
  } else if (candidate?.finishReason === 'MAX_TOKENS') {
    stopReason = 'max_tokens';
  }

  const usage = raw.usageMetadata || {};
  return {
    stop_reason: stopReason,
    content: blocks,
    usage: {
      input_tokens: usage.promptTokenCount || 0,
      output_tokens: (usage.candidatesTokenCount || 0) + (usage.thoughtsTokenCount || 0),
    },
  };
}

// Proveedor Gemini (SDK oficial @google/genai, function calling). La llave sale
// de GEMINI_API_KEY, nunca del codigo. `client` permite inyectar un SDK
// simulado en los tests.
function createGeminiProvider({ apiKey, model, client }) {
  if (!apiKey) {
    throw new Error('LLM_PROVIDER=gemini requiere GEMINI_API_KEY.');
  }
  const ai = client || new GoogleGenAI({ apiKey });
  const modelId = model || DEFAULT_MODEL;

  return {
    name: 'gemini',
    model: modelId,
    isProviderError: (err) => err instanceof ApiError,
    async createMessage({ system, messages, tools }) {
      const raw = await ai.models.generateContent({
        model: modelId,
        contents: toContents(messages),
        config: {
          systemInstruction: system,
          maxOutputTokens: 4096,
          tools: [
            {
              functionDeclarations: tools.map((t) => ({
                name: t.name,
                description: t.description,
                parametersJsonSchema: t.input_schema,
              })),
            },
          ],
          // AUTO: el modelo decide si llama tools (igual que con Anthropic).
          toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
        },
      });
      return fromResponse(raw);
    },
  };
}

module.exports = { createGeminiProvider, DEFAULT_MODEL };
