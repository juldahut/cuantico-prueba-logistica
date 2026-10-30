'use strict';

require('dotenv').config();

function required(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisa backend/.env.example.`);
  }

  return value;
}

module.exports = {
  port: process.env.PORT || 3001,
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  // Un solo origen configurable; sin credentials (el JWT viaja en Authorization).
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Proveedor del LLM del agente. "fake" (por defecto) usa un modelo simulado
  // determinista: sirve para tests y para correr el proyecto sin llave.
  llmProvider: process.env.LLM_PROVIDER || 'fake',
  // Opcional. Solo se lee si LLM_PROVIDER=anthropic. Nunca va en el codigo.
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  anthropicModel: process.env.ANTHROPIC_MODEL || '',
};
