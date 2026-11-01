'use strict';

require('dotenv').config({ quiet: true });

const { intFromEnv } = require('./parse');

function required(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisa backend/.env.example.`);
  }

  return value;
}

// Una clave HMAC corta se puede adivinar por fuerza bruta: minimo 32 caracteres.
function secret(name) {
  const value = required(name);
  if (value.length < 32) {
    throw new Error(`${name} debe tener al menos 32 caracteres. Revisa backend/.env.example.`);
  }
  return value;
}

module.exports = {
  port: process.env.PORT || 3001,
  jwtSecret: secret('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  // Un solo origen configurable; sin credentials (el JWT viaja en Authorization).
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Proveedor del LLM del agente: "fake", "anthropic", "gemini", "groq", "ollama" o "compatible". "fake" (por defecto) usa un modelo simulado
  // determinista: sirve para tests y para correr el proyecto sin llave.
  llmProvider: process.env.LLM_PROVIDER || 'fake',
  // Opcional. Solo se lee si LLM_PROVIDER=anthropic. Nunca va en el codigo.
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || '',
  // Opcionales. Solo se leen si LLM_PROVIDER=gemini. Nunca van en el codigo.
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || '',
  // Opcionales. Proveedores compatibles con la API de OpenAI (LLM_PROVIDER=groq,
  // ollama o compatible). Nunca van en el codigo.
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || '',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || '',
  ollamaModel: process.env.OLLAMA_MODEL || '',
  llmBaseUrl: process.env.LLM_BASE_URL || '',
  llmApiKey: process.env.LLM_API_KEY || '',
  llmModel: process.env.LLM_MODEL || '',
  // Tiempo maximo de espera de una llamada al LLM, en ms. Aplica por intento:
  // el SDK de Anthropic reintenta hasta 2 veces, asi que el peor caso de una
  // llamada es mayor.
  llmTimeoutMs: intFromEnv('LLM_TIMEOUT_MS', { defaultValue: 30000 }),
  // Limites de peticiones por minuto. Ingesta: por cuenta autenticada (IP de
  // respaldo); el default de 600 es conservador para una cuenta de demo, y un
  // emisor real a escala del ADR 0001 sube INGEST_RPM. Agente: por usuario.
  // Topes altos pero finitos: un valor absurdo anularia el control en silencio.
  ingestRpm: intFromEnv('INGEST_RPM', { defaultValue: 600, max: 100000 }),
  agentRpm: intFromEnv('AGENT_RPM', { defaultValue: 20, max: 600 }),
  // Consultas de lectura (busqueda, totales, auditoria): por cuenta.
  readRpm: intFromEnv('READ_RPM', { defaultValue: 120, max: 10000 }),
  // Plazo total de una pregunta al agente, en ms (suma de todas sus llamadas).
  agentDeadlineMs: intFromEnv('AGENT_DEADLINE_MS', { defaultValue: 60000, max: 600000 }),
  // Saltos de proxy confiables (balanceador, nginx). null = sin configurar: no
  // se confia en X-Forwarded-For y el limitador ve la IP del ultimo salto.
  trustProxy: intFromEnv('TRUST_PROXY', { defaultValue: null, min: 0, max: 32 }),
};
