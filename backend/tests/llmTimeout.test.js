'use strict';

// Sin llamadas reales ni de pago: el proveedor de estos tests es el simulado.
process.env.LLM_PROVIDER = 'fake';

/* global jest, DOMException */

// El timeout del cliente del LLM (LLM_TIMEOUT_MS) con los SDK reales contra un
// servidor local que nunca responde. Verifica que clase de error sale de cada
// SDK al vencer el plazo y que sigue siendo "error del proveedor" (502).
const http = require('http');
const { execFileSync } = require('child_process');
const request = require('supertest');
const app = require('../src/app');
const { createGeminiProvider } = require('../src/agent/providers/gemini');
const { createAnthropicProvider } = require('../src/agent/providers/anthropic');
const { createProvider, getProvider } = require('../src/agent/providers');
const { SYSTEM_PROMPT } = require('../src/agent/agent.service');
const { TOOL_DEFINITIONS } = require('../src/agent/tools');
const { sequelize, resetDb, createMerchant, createUser } = require('./helpers');

jest.setTimeout(30000);

// El manejador de errores registra el 502 esperado; se silencia para no ensuciar la salida.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

const params = {
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: 'hola' }],
  tools: TOOL_DEFINITIONS,
};

let server;
let baseUrl;
let sockets;
let user;

beforeAll(async () => {
  // Acepta la conexion y nunca contesta.
  sockets = new Set();
  server = http.createServer(() => {});
  server.on('connection', (s) => {
    sockets.add(s);
    s.on('close', () => sockets.delete(s));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  process.env.GOOGLE_GEMINI_BASE_URL = baseUrl;
  process.env.ANTHROPIC_BASE_URL = baseUrl;

  await resetDb();
  const { merchant } = await createMerchant();
  user = await createUser({ role: 'operaciones', merchantIds: [merchant.id] });
});

afterAll(async () => {
  delete process.env.GOOGLE_GEMINI_BASE_URL;
  delete process.env.ANTHROPIC_BASE_URL;
  for (const s of sockets) s.destroy();
  await new Promise((resolve) => server.close(resolve));
  await sequelize.close();
});

// Reemplaza createMessage/isProviderError del proveedor que usa el controlador
// por los del proveedor real con timeout, y los restaura al terminar.
async function chatWith(real) {
  const provider = getProvider();
  const saved = {
    createMessage: provider.createMessage,
    isProviderError: provider.isProviderError,
  };
  provider.createMessage = real.createMessage;
  provider.isProviderError = real.isProviderError;
  try {
    return await request(app).post('/agent/chat').set(user.auth).send({ message: 'hola' });
  } finally {
    provider.createMessage = saved.createMessage;
    provider.isProviderError = saved.isProviderError;
  }
}

// El SDK de Gemini no puede hacer fetch real dentro del sandbox de Jest (sin
// dispatcher de undici), asi que su timeout real se prueba en un proceso de
// Node aparte contra el mismo servidor que nunca responde.
function geminiTimeoutInChildProcess() {
  const script = `
    const http = require('http');
    const { createGeminiProvider } = require(${JSON.stringify(
      require.resolve('../src/agent/providers/gemini'),
    )});
    const srv = http.createServer(() => {});
    srv.listen(0, '127.0.0.1', async () => {
      process.env.GOOGLE_GEMINI_BASE_URL = 'http://127.0.0.1:' + srv.address().port;
      const provider = createGeminiProvider({ apiKey: 'k', timeoutMs: 200 });
      const started = Date.now();
      const err = await provider
        .createMessage({ system: 's', messages: [{ role: 'user', content: 'h' }], tools: [] })
        .catch((e) => e);
      console.log(
        JSON.stringify({
          name: err.name,
          isProviderError: provider.isProviderError(err),
          ms: Date.now() - started,
        }),
      );
      process.exit(0);
    });
  `;
  return JSON.parse(
    execFileSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 20000 }),
  );
}

describe('timeout del cliente del LLM', () => {
  it('gemini (SDK real): el plazo vencido sale como AbortError y es error del proveedor', () => {
    const result = geminiTimeoutInChildProcess();
    expect(result.name).toBe('AbortError');
    expect(result.isProviderError).toBe(true);
    expect(result.ms).toBeLessThan(5000);
  });

  it('gemini: un AbortError del SDK se responde como 502 con el mensaje claro', async () => {
    const abort = new DOMException('This operation was aborted', 'AbortError');
    const client = {
      models: {
        generateContent: async () => {
          throw abort;
        },
      },
    };
    const res = await chatWith(createGeminiProvider({ apiKey: 'k', client }));
    expect(res.status).toBe(502);
    expect(res.body.error.message).toBe('El asistente no está disponible ahora.');
  });

  it('anthropic (SDK real): el plazo vencido es error del proveedor y el chat responde 502', async () => {
    const provider = createAnthropicProvider({ apiKey: 'k', timeoutMs: 200 });

    const err = await provider.createMessage(params).catch((e) => e);
    expect(err.constructor.name).toBe('APIConnectionTimeoutError');
    expect(provider.isProviderError(err)).toBe(true);

    const res = await chatWith(createAnthropicProvider({ apiKey: 'k', timeoutMs: 200 }));
    expect(res.status).toBe(502);
    expect(res.body.error.message).toBe('El asistente no está disponible ahora.');
  });

  it('LLM_TIMEOUT_MS llega al cliente de Anthropic desde la configuracion', async () => {
    const provider = createProvider({
      llmProvider: 'anthropic',
      anthropicApiKey: 'k',
      llmTimeoutMs: 200,
    });
    const started = Date.now();
    const err = await provider.createMessage(params).catch((e) => e);
    expect(provider.isProviderError(err)).toBe(true);
    expect(Date.now() - started).toBeLessThan(10000);
  });
});
