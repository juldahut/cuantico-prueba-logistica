'use strict';

/* global DOMException */

const { ApiError } = require('@google/genai');
const { createGeminiProvider, DEFAULT_MODEL } = require('../src/agent/providers/gemini');
const { createProvider } = require('../src/agent/providers');
const { runAgent, SYSTEM_PROMPT } = require('../src/agent/agent.service');
const { TOOL_DEFINITIONS } = require('../src/agent/tools');
const { ingestEvent } = require('../src/services/ingestion.service');
const { principalFromToken } = require('../src/services/auth.service');
const { sequelize, resetDb, createMerchant, createUser, PICKUP, DROPOFF } = require('./helpers');

const NOW = new Date('2026-10-29T15:00:00Z');

// SDK simulado: misma forma que GoogleGenAI.models.generateContent. Devuelve
// respuestas fijas en orden y guarda cada peticion.
function fakeClient(responses) {
  const requests = [];
  let i = 0;
  return {
    requests,
    models: {
      async generateContent(params) {
        requests.push(structuredClone(params));
        const r = responses[Math.min(i, responses.length - 1)];
        i += 1;
        return r;
      },
    },
  };
}

function modelTurn(parts, finishReason = 'STOP') {
  return {
    candidates: [{ content: { role: 'model', parts }, finishReason }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, thoughtsTokenCount: 5 },
  };
}

describe('proveedor gemini: traduccion de la peticion y la respuesta', () => {
  it('exige GEMINI_API_KEY', () => {
    expect(() => createGeminiProvider({ apiKey: '' })).toThrow(/GEMINI_API_KEY/);
  });

  it('envia system prompt, tools como functionDeclarations y el mensaje del usuario', async () => {
    const client = fakeClient([modelTurn([{ text: 'Hola.' }])]);
    const provider = createGeminiProvider({ apiKey: 'k', client });

    const response = await provider.createMessage({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: 'hola' }],
      tools: TOOL_DEFINITIONS,
    });

    const [req] = client.requests;
    expect(req.model).toBe(DEFAULT_MODEL);
    expect(req.contents).toEqual([{ role: 'user', parts: [{ text: 'hola' }] }]);
    expect(req.config.systemInstruction).toBe(SYSTEM_PROMPT);
    expect(req.config.maxOutputTokens).toBe(4096);
    expect(req.config.toolConfig).toEqual({ functionCallingConfig: { mode: 'AUTO' } });
    const declarations = req.config.tools[0].functionDeclarations;
    expect(declarations.map((d) => d.name)).toEqual(TOOL_DEFINITIONS.map((t) => t.name));
    expect(declarations[2].parametersJsonSchema).toEqual(TOOL_DEFINITIONS[2].input_schema);

    expect(response).toEqual({
      stop_reason: 'end_turn',
      content: [expect.objectContaining({ type: 'text', text: 'Hola.' })],
      usage: { input_tokens: 100, output_tokens: 25 },
    });
  });

  it('convierte functionCall en tool_use y no expone los pensamientos como texto', async () => {
    const client = fakeClient([
      modelTurn([
        { text: 'razonando...', thought: true },
        { functionCall: { name: 'list_merchants', args: {} }, thoughtSignature: 'firma-1' },
      ]),
    ]);
    const provider = createGeminiProvider({ apiKey: 'k', model: 'modelo-x', client });

    const response = await provider.createMessage({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: 'x' }],
      tools: TOOL_DEFINITIONS,
    });

    expect(client.requests[0].model).toBe('modelo-x');
    expect(response.stop_reason).toBe('tool_use');
    expect(response.content.map(({ type, name, input }) => ({ type, name, input }))).toEqual([
      { type: 'tool_use', name: 'list_merchants', input: {} },
    ]);
    expect(response.content[0].id).toEqual(expect.any(String));
  });

  it.each([
    [{ ...modelTurn([], 'SAFETY') }, 'refusal'],
    [{ candidates: [], promptFeedback: { blockReason: 'PROHIBITED_CONTENT' } }, 'refusal'],
    [modelTurn([{ text: 'corta' }], 'MAX_TOKENS'), 'max_tokens'],
  ])('mapea el cierre de Gemini a stop_reason (%#)', async (raw, expected) => {
    const provider = createGeminiProvider({ apiKey: 'k', client: fakeClient([raw]) });
    const response = await provider.createMessage({
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: 'x' }],
      tools: TOOL_DEFINITIONS,
    });
    expect(response.stop_reason).toBe(expected);
  });

  it('reconoce los errores de la API como errores del proveedor', () => {
    const provider = createGeminiProvider({ apiKey: 'k', client: fakeClient([]) });
    expect(provider.isProviderError(new ApiError({ message: 'cuota', status: 429 }))).toBe(true);
    expect(provider.isProviderError(new Error('otro'))).toBe(false);
  });

  it('un timeout (AbortError del fetch) tambien es error del proveedor', () => {
    const provider = createGeminiProvider({ apiKey: 'k', client: fakeClient([]) });
    const abort = new DOMException('This operation was aborted', 'AbortError');
    const timeout = new DOMException('The operation timed out', 'TimeoutError');
    expect(provider.isProviderError(abort)).toBe(true);
    expect(provider.isProviderError(timeout)).toBe(true);
    expect(provider.isProviderError(new TypeError('fetch failed'))).toBe(false);
  });

  it('LLM_PROVIDER=gemini selecciona este proveedor con GEMINI_MODEL', () => {
    const provider = createProvider({
      llmProvider: 'gemini',
      geminiApiKey: 'k',
      geminiModel: 'gemini-modelo',
    });
    expect(provider.name).toBe('gemini');
    expect(provider.model).toBe('gemini-modelo');
    expect(createProvider({ llmProvider: 'fake' }).name).toBe('fake');
  });
});

describe('proveedor gemini en el bucle del agente', () => {
  let la80;
  let farmacia;
  let user;

  beforeAll(async () => {
    await resetDb();
    ({ merchant: la80 } = await createMerchant({ name: 'Tienda La 80' }));
    ({ merchant: farmacia } = await createMerchant({ name: 'Farmacia Central' }));
    const base = { deliveryId: 'G-1', merchantId: la80.id };
    await ingestEvent({
      ...base,
      eventId: 'G-1-1',
      type: 'recogida',
      occurredAt: '2026-10-21T18:30:00Z',
      location: PICKUP,
    });
    await ingestEvent({
      ...base,
      eventId: 'G-1-2',
      type: 'entregada',
      occurredAt: '2026-10-21T19:00:00Z',
      location: DROPOFF,
    });
    const ops = await createUser({ role: 'operaciones', merchantIds: [la80.id] });
    user = await principalFromToken(ops.token);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('ejecuta las tools, devuelve functionResponse y conserva la firma de pensamiento', async () => {
    const callPart = {
      functionCall: {
        name: 'get_merchant_totals',
        args: {
          merchant_id: la80.id,
          expression: 'rango',
          start_date: '2026-10-19',
          end_date: '2026-10-25',
        },
      },
      thoughtSignature: 'firma-1',
    };
    const client = fakeClient([
      modelTurn([callPart]),
      modelTurn([{ text: 'Tienda La 80 facturó 6.334 COP del 2026-10-19 al 2026-10-25.' }]),
    ]);

    const result = await runAgent({
      user,
      message: '¿Cuánto facturó Tienda La 80?',
      provider: createGeminiProvider({ apiKey: 'k', client }),
      now: NOW,
    });

    expect(result).toMatchObject({ verified: true, stopReason: 'end_turn', provider: 'gemini' });
    expect(result.toolCalls[1].output.totals).toEqual([{ currency: 'COP', amount: 6334 }]);

    // contents: pregunta + intercambio list_merchants del servidor, y luego el
    // turno del modelo con su functionCall y la respuesta de la tool.
    const [userTurn, , , modelTurnReplayed, toolTurn] = client.requests[1].contents;
    expect(userTurn.role).toBe('user');
    // El turno del modelo se reenvia tal cual, con su thoughtSignature.
    expect(modelTurnReplayed).toEqual({ role: 'model', parts: [callPart] });
    expect(toolTurn.role).toBe('user');
    const { functionResponse } = toolTurn.parts[0];
    expect(functionResponse.name).toBe('get_merchant_totals');
    expect(functionResponse.response.output.totals).toEqual([{ currency: 'COP', amount: 6334 }]);
  });

  it('el alcance lo impone el servidor: pedir otro comercio vuelve como error', async () => {
    const client = fakeClient([
      modelTurn([
        {
          functionCall: {
            id: 'fc-1',
            name: 'get_merchant_totals',
            args: {
              merchant_id: farmacia.id,
              expression: 'ayer',
              start_date: null,
              end_date: null,
            },
          },
        },
      ]),
      modelTurn([{ text: 'No tienes acceso.' }]),
    ]);

    const result = await runAgent({
      user,
      message: 'x',
      provider: createGeminiProvider({ apiKey: 'k', client }),
      now: NOW,
    });

    expect(result.toolCalls[1].error).toBe('FORBIDDEN');
    const { functionResponse } = client.requests[1].contents[4].parts[0];
    expect(functionResponse).toMatchObject({ id: 'fc-1', name: 'get_merchant_totals' });
    expect(functionResponse.response.error.error).toBe('FORBIDDEN');
  });

  it('traduce el list_merchants del servidor a functionCall + functionResponse', async () => {
    const client = fakeClient([modelTurn([{ text: 'Hola.' }])]);

    const result = await runAgent({
      user,
      message: 'hola',
      provider: createGeminiProvider({ apiKey: 'k', client }),
      now: NOW,
    });

    // Una sola llamada al modelo: la lista ya viene resuelta.
    expect(client.requests).toHaveLength(1);
    expect(result.steps).toBe(1);
    const [question, call, answer] = client.requests[0].contents;
    expect(question).toEqual({ role: 'user', parts: [{ text: 'hola' }] });
    // Sin thoughtSignature: es opcional en el SDK y gemini-2.5-flash no la exige.
    expect(call).toEqual({
      role: 'model',
      parts: [{ functionCall: { name: 'list_merchants', args: {} } }],
    });
    expect(answer.role).toBe('user');
    expect(answer.parts).toHaveLength(1);
    const { functionResponse } = answer.parts[0];
    expect(functionResponse.name).toBe('list_merchants');
    // Alcance del usuario de la sesion: solo Tienda La 80.
    expect(functionResponse.response.output.merchants.map((m) => m.name)).toEqual(['Tienda La 80']);
  });

  it('una cifra inventada por Gemini tampoco pasa la verificacion', async () => {
    const client = fakeClient([modelTurn([{ text: 'Facturó 999.999 COP.' }])]);
    const result = await runAgent({
      user,
      message: 'x',
      provider: createGeminiProvider({ apiKey: 'k', client }),
      now: NOW,
    });
    expect(result.verified).toBe(false);
  });
});

describe('proveedor gemini: ids repetidos entre turnos', () => {
  it('cada functionResponse lleva el nombre de su propia llamada aunque Gemini repita el id', async () => {
    const client = fakeClient([modelTurn([{ text: 'fin' }])]);
    const provider = createGeminiProvider({ apiKey: 'k', client });
    const messages = [
      { role: 'user', content: 'x' },
      {
        role: 'assistant',
        content: [
          { type: 'tool_use', id: 'a', name: 'list_merchants', input: {}, _geminiCallId: 'fc-1' },
        ],
      },
      {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'a', content: '{"merchants":[]}' }],
      },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'b',
            name: 'search_deliveries',
            input: { q: 'x' },
            _geminiCallId: 'fc-1',
          },
        ],
      },
      {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'b', content: '{"count":0,"results":[]}' }],
      },
    ];

    await provider.createMessage({ system: SYSTEM_PROMPT, messages, tools: TOOL_DEFINITIONS });

    const responses = client.requests[0].contents
      .filter((c) => c.parts[0].functionResponse)
      .map((c) => c.parts[0].functionResponse);
    expect(responses.map((r) => [r.id, r.name])).toEqual([
      ['fc-1', 'list_merchants'],
      ['fc-1', 'search_deliveries'],
    ]);
  });
});
