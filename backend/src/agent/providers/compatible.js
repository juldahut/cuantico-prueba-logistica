'use strict';

/* global AbortSignal */

// Proveedor para APIs compatibles con "chat completions" de OpenAI: Groq (capa
// gratuita), Ollama (modelo local, sin cuota), Mistral, OpenRouter, etc. Sin
// SDK: usa fetch (Node 24), asi no se suma una dependencia. La llave sale de
// variables de entorno, nunca del codigo, y solo viaja en el encabezado
// Authorization hacia la URL configurada.
//
// Habla el mismo formato interno que los demas proveedores (bloques text /
// tool_use / tool_result) y lo traduce de ida y vuelta. El modelo solo
// orquesta: las tools, el alcance y la verificacion de cifras no cambian.

// Error de la API del proveedor (HTTP no exitoso). Solo lleva el estado y un
// detalle corto: el cuerpo completo podria traer datos que no queremos en logs.
class ProviderHttpError extends Error {
  constructor(status, detail) {
    super(`El proveedor respondio ${status}`);
    this.name = 'ProviderHttpError';
    this.status = status;
    this.detail = detail;
  }
}

function textOf(blocks) {
  return blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

// Formato interno -> mensajes de "chat completions".
function toMessages(system, messages) {
  const out = [{ role: 'system', content: system }];
  for (const message of messages) {
    if (typeof message.content === 'string') {
      out.push({ role: message.role, content: message.content });
    } else if (message.role === 'assistant') {
      const calls = message.content
        .filter((b) => b.type === 'tool_use')
        .map((b) => ({
          id: b.id,
          type: 'function',
          function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) },
        }));
      out.push({
        role: 'assistant',
        content: textOf(message.content) || null,
        ...(calls.length ? { tool_calls: calls } : {}),
      });
    } else {
      // Los resultados de tools van primero y pegados al turno del asistente.
      for (const block of message.content) {
        if (block.type === 'tool_result') {
          out.push({
            role: 'tool',
            tool_call_id: block.tool_use_id,
            content:
              typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
          });
        }
      }
      const text = textOf(message.content);
      if (text) out.push({ role: 'user', content: text });
    }
  }
  return out;
}

// Respuesta de "chat completions" -> formato interno.
function fromResponse(data) {
  const choice = data?.choices?.[0];
  const message = choice?.message;
  if (!message) throw new ProviderHttpError(502, 'respuesta sin mensaje');

  const content = [];
  if (typeof message.content === 'string' && message.content.trim()) {
    content.push({ type: 'text', text: message.content });
  }
  (message.tool_calls ?? []).forEach((call, index) => {
    // Un modelo pequeno puede devolver argumentos que no son JSON: entrada
    // vacia, y la tool responde INVALID_INPUT en vez de romper la pregunta.
    let input;
    try {
      input = JSON.parse(call.function?.arguments || '{}');
    } catch {
      input = {};
    }
    if (input === null || typeof input !== 'object' || Array.isArray(input)) input = {};
    content.push({
      type: 'tool_use',
      id: call.id || `call_${index}`,
      name: String(call.function?.name ?? ''),
      input,
    });
  });

  let stopReason = 'end_turn';
  if (content.some((b) => b.type === 'tool_use')) stopReason = 'tool_use';
  else if (choice.finish_reason === 'content_filter') stopReason = 'refusal';

  return {
    content,
    stop_reason: stopReason,
    usage: {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
    },
  };
}

// Errores del proveedor: respuesta HTTP de error, timeout o red caida. Asi un
// proveedor lento o sin cuota termina en 502/429 claro y no en un 500.
function isProviderError(err) {
  return (
    err instanceof ProviderHttpError ||
    err?.name === 'AbortError' ||
    err?.name === 'TimeoutError' ||
    err instanceof TypeError
  );
}

function createCompatibleProvider({
  name = 'compatible',
  apiKey = '',
  baseUrl,
  model,
  timeoutMs = 30000,
  requireKey = false,
  fetchImpl = fetch,
}) {
  if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
    throw new Error(`LLM_PROVIDER=${name} requiere una URL base http(s) valida.`);
  }
  if (!model) throw new Error(`LLM_PROVIDER=${name} requiere un modelo.`);
  if (requireKey && !apiKey) {
    throw new Error(`LLM_PROVIDER=${name} requiere su llave de API (ver .env.example).`);
  }
  const root = baseUrl.replace(/\/+$/, '');

  return {
    name,
    model,
    isProviderError,
    // El turno sintetico de list_merchants es un intercambio normal
    // tool_calls / tool: este formato lo acepta cualquier servidor compatible.
    preloadMerchants: true,
    async createMessage({ system, messages, tools }) {
      const res = await fetchImpl(`${root}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: toMessages(system, messages),
          tools: tools.map((t) => ({
            type: 'function',
            function: { name: t.name, description: t.description, parameters: t.input_schema },
          })),
          tool_choice: 'auto',
          temperature: 0,
          max_tokens: 1024,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new ProviderHttpError(res.status, String(body?.error?.message ?? '').slice(0, 200));
      }
      return fromResponse(await res.json());
    },
  };
}

module.exports = { createCompatibleProvider, ProviderHttpError, toMessages, fromResponse };
