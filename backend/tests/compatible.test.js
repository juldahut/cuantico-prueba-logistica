'use strict';

const {
  createCompatibleProvider,
  ProviderHttpError,
  toMessages,
  fromResponse,
} = require('../src/agent/providers/compatible');
const { createProvider } = require('../src/agent/providers');
const { runAgent, SYSTEM_PROMPT } = require('../src/agent/agent.service');
const { TOOL_DEFINITIONS } = require('../src/agent/tools');
const { ingestEvent } = require('../src/services/ingestion.service');
const { principalFromToken } = require('../src/services/auth.service');
const { sequelize, resetDb, createMerchant, createUser, deliveryEvents } = require('./helpers');

const NOW = new Date('2026-10-29T15:00:00Z');

// fetch simulado: devuelve respuestas fijas en orden y guarda cada peticion.
function fakeFetch(responses) {
  const requests = [];
  let i = 0;
  const impl = async (url, options) => {
    requests.push({ url, headers: options.headers, body: JSON.parse(options.body) });
    const r = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return r;
  };
  impl.requests = requests;
  return impl;
}

const ok = (message, finish = 'stop') => ({
  ok: true,
  status: 200,
  json: async () => ({
    choices: [{ message, finish_reason: finish }],
    usage: { prompt_tokens: 120, completion_tokens: 15 },
  }),
});
const failed = (status, message = 'x') => ({
  ok: false,
  status,
  json: async () => ({ error: { message } }),
});

const make = (fetchImpl, extra = {}) =>
  createCompatibleProvider({
    name: 'groq',
    apiKey: 'llave-de-prueba',
    baseUrl: 'https://api.example.test/openai/v1/',
    model: 'modelo-x',
    fetchImpl,
    ...extra,
  });

describe('proveedor compatible: traduccion de la peticion', () => {
  it('envia system, tools como funciones, llave en el encabezado y temperatura 0', async () => {
    const f = fakeFetch([ok({ content: 'Hola.' })]);
    await make(f).createMessage({
      system: 'SISTEMA',
      messages: [{ role: 'user', content: 'hola' }],
      tools: TOOL_DEFINITIONS,
    });
    const [req] = f.requests;
    expect(req.url).toBe('https://api.example.test/openai/v1/chat/completions');
    expect(req.headers.Authorization).toBe('Bearer llave-de-prueba');
    expect(req.body).toMatchObject({
      model: 'modelo-x',
      temperature: 0,
      tool_choice: 'auto',
      messages: [
        { role: 'system', content: 'SISTEMA' },
        { role: 'user', content: 'hola' },
      ],
    });
    expect(req.body.tools).toHaveLength(TOOL_DEFINITIONS.length);
    expect(req.body.tools[0]).toMatchObject({
      type: 'function',
      function: { name: TOOL_DEFINITIONS[0].name, parameters: expect.any(Object) },
    });
  });

  it('sin llave (modelo local) no manda Authorization', async () => {
    const f = fakeFetch([ok({ content: 'ok' })]);
    await make(f, { apiKey: '' }).createMessage({ system: 's', messages: [], tools: [] });
    expect(f.requests[0].headers.Authorization).toBeUndefined();
  });

  it('traduce tool_use / tool_result a tool_calls / mensajes tool', () => {
    const out = toMessages('S', [
      { role: 'user', content: 'pregunta' },
      {
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'c1', name: 'list_merchants', input: {} }],
      },
      {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'c1', content: '{"merchants":[]}' }],
      },
    ]);
    expect(out).toEqual([
      { role: 'system', content: 'S' },
      { role: 'user', content: 'pregunta' },
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          { id: 'c1', type: 'function', function: { name: 'list_merchants', arguments: '{}' } },
        ],
      },
      { role: 'tool', tool_call_id: 'c1', content: '{"merchants":[]}' },
    ]);
  });
});

describe('proveedor compatible: traduccion de la respuesta', () => {
  it('texto simple termina el turno y cuenta tokens', () => {
    const r = fromResponse({
      choices: [{ message: { content: 'Hola' } }],
      usage: { prompt_tokens: 7, completion_tokens: 3 },
    });
    expect(r).toEqual({
      content: [{ type: 'text', text: 'Hola' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 7, output_tokens: 3 },
    });
  });

  it('tool_calls se vuelven bloques tool_use con la entrada ya parseada', () => {
    const r = fromResponse({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              {
                id: 'abc',
                type: 'function',
                function: { name: 'get_merchant_totals', arguments: '{"merchant_id":1}' },
              },
            ],
          },
          finish_reason: 'tool_calls',
        },
      ],
    });
    expect(r.stop_reason).toBe('tool_use');
    expect(r.content).toEqual([
      { type: 'tool_use', id: 'abc', name: 'get_merchant_totals', input: { merchant_id: 1 } },
    ]);
  });

  it('argumentos que no son JSON (modelo pequeno) dejan entrada vacia, sin romper', () => {
    const r = fromResponse({
      choices: [
        {
          message: {
            tool_calls: [{ id: 'x', function: { name: 'search_deliveries', arguments: '{roto' } }],
          },
        },
      ],
    });
    expect(r.content[0]).toMatchObject({ type: 'tool_use', name: 'search_deliveries', input: {} });
  });

  it('un bloqueo del proveedor (content_filter) se trata como refusal', () => {
    const r = fromResponse({
      choices: [{ message: { content: '' }, finish_reason: 'content_filter' }],
    });
    expect(r.stop_reason).toBe('refusal');
  });
});

describe('proveedor compatible: errores y configuracion', () => {
  it('un HTTP de error es un error del proveedor con su estado (429 = cuota)', async () => {
    const p = make(fakeFetch([failed(429, 'Rate limit reached')]));
    const err = await p.createMessage({ system: 's', messages: [], tools: [] }).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderHttpError);
    expect(err.status).toBe(429);
    expect(p.isProviderError(err)).toBe(true);
  });

  it('red caida, timeout y errores de otro tipo se clasifican bien', () => {
    const p = make(fakeFetch([ok({ content: '' })]));
    expect(p.isProviderError(new TypeError('fetch failed'))).toBe(true);
    expect(p.isProviderError(Object.assign(new Error('t'), { name: 'TimeoutError' }))).toBe(true);
    expect(p.isProviderError(new Error('bug nuestro'))).toBe(false);
  });

  it('la llave nunca aparece en el mensaje del error', async () => {
    const p = make(fakeFetch([failed(401, 'Invalid API Key llave-de-prueba')]));
    const err = await p.createMessage({ system: 's', messages: [], tools: [] }).catch((e) => e);
    expect(err.message).not.toMatch(/llave-de-prueba/);
  });

  it('createProvider arma groq, ollama y compatible, y exige lo necesario', () => {
    expect(() => createProvider({ llmProvider: 'groq', groqApiKey: '' })).toThrow(/llave/);
    expect(createProvider({ llmProvider: 'groq', groqApiKey: 'k' })).toMatchObject({
      name: 'groq',
      model: 'llama-3.3-70b-versatile',
    });
    expect(createProvider({ llmProvider: 'ollama' })).toMatchObject({ name: 'ollama' });
    expect(() => createProvider({ llmProvider: 'compatible' })).toThrow(/URL base/);
    expect(() => createProvider({ llmProvider: 'compatible', llmBaseUrl: 'http://x/v1' })).toThrow(
      /modelo/,
    );
    expect(
      createProvider({ llmProvider: 'compatible', llmBaseUrl: 'http://x/v1', llmModel: 'm' }),
    ).toMatchObject({ name: 'compatible', model: 'm' });
  });
});

describe('proveedor compatible dentro del agente', () => {
  let user;
  let merchantId;

  beforeAll(async () => {
    await resetDb();
    const { merchant } = await createMerchant({ name: 'Tienda La 80' });
    merchantId = merchant.id;
    for (const event of deliveryEvents(merchant.id)) await ingestEvent(event);
    const account = await createUser({ role: 'operaciones', merchantIds: [merchant.id] });
    user = await principalFromToken(account.auth.Authorization.replace('Bearer ', ''));
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('flujo completo: preinyecta la lista y el modelo solo hace 2 llamadas', async () => {
    const f = fakeFetch([
      ok(
        {
          content: null,
          tool_calls: [
            {
              id: 'call_1',
              type: 'function',
              function: {
                name: 'get_merchant_totals',
                arguments: JSON.stringify({ merchant_id: merchantId, expression: 'semana_pasada' }),
              },
            },
          ],
        },
        'tool_calls',
      ),
      ok({ content: 'Listo.' }),
    ]);
    const result = await runAgent({
      user,
      message: '¿Cuánto facturó Tienda La 80 la semana pasada?',
      provider: make(f),
      now: NOW,
    });

    expect(f.requests).toHaveLength(2);
    expect(f.requests[0].body.messages[0]).toEqual({ role: 'system', content: SYSTEM_PROMPT });
    expect(f.requests[0].body.messages.map((m) => m.role)).toEqual([
      'system',
      'user',
      'assistant',
      'tool',
    ]);
    expect(result.toolCalls.map((c) => c.name)).toEqual(['list_merchants', 'get_merchant_totals']);
    expect(result.provider).toBe('groq');
  });

  it('una cifra inventada por este modelo tampoco pasa la verificacion', async () => {
    const result = await runAgent({
      user,
      message: 'x',
      provider: make(fakeFetch([ok({ content: 'Facturó 999.999 COP.' })])),
      now: NOW,
    });
    expect(result.verified).toBe(false);
    expect(result.reply).not.toMatch(/999/);
  });

  it('un modelo que pide el comercio de otro recibe un error de acceso, no sus datos', async () => {
    const f = fakeFetch([
      ok(
        {
          tool_calls: [
            {
              id: 'c9',
              type: 'function',
              function: { name: 'get_merchant_notes', arguments: '{"merchant_id":999}' },
            },
          ],
        },
        'tool_calls',
      ),
      ok({ content: 'No tengo acceso a ese comercio.' }),
    ]);
    const result = await runAgent({
      user,
      message: 'notas del comercio 999',
      provider: make(f),
      now: NOW,
    });
    const call = result.toolCalls.find((c) => c.name === 'get_merchant_notes');
    expect(call.output).toBeUndefined();
    expect(call.error).toMatch(/FORBIDDEN|NOT_FOUND/);
  });

  it('un 429 del proveedor llega como error del proveedor (cuota), no como 500', async () => {
    const p = make(fakeFetch([failed(429)]));
    const err = await runAgent({ user, message: 'hola', provider: p, now: NOW }).catch((e) => e);
    expect(p.isProviderError(err)).toBe(true);
    expect(err.status).toBe(429);
  });
});
