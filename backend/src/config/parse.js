'use strict';

// Lee un entero de una variable de entorno. Vacia o sin definir devuelve
// `defaultValue`; cualquier otra cosa que no sea un entero decimal dentro de
// [min, max] hace fallar el arranque con un mensaje claro (mejor que arrancar
// con un limite en NaN que nadie nota).
function intFromEnv(name, { defaultValue, min = 1, max = 2147483647 } = {}) {
  const raw = process.env[name];

  if (raw === undefined || raw.trim() === '') return defaultValue;

  const text = raw.trim();
  const value = Number(text);

  if (!/^\d+$/.test(text) || !Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(
      `${name} debe ser un entero entre ${min} y ${max} (recibido: "${text.slice(0, 20)}"). Revisa backend/.env.example.`,
    );
  }

  return value;
}

module.exports = { intFromEnv };
