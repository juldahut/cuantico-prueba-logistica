const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Mismo envelope de error que ya usa el backend en todas sus rutas:
// { error: { message, status, details? } } (ver backend/src/middlewares/errorHandler.js).
export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details ?? null;
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexion.', 0, null);
  }

  if (res.status === 204) {
    return null;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      data?.error?.message || 'Ocurrio un error inesperado.',
      res.status,
      data?.error?.details ?? null,
    );
  }

  return data;
}

export function apiGet(path, token) {
  return request(path, { token });
}

export function apiPost(path, body, token) {
  return request(path, { method: 'POST', body, token });
}

// Arma un query string omitiendo valores vacios (undefined/null/''),
// para no mandar filtros "vacios" como ?q=&from= al backend.
export function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}
