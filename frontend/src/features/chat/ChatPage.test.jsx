import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ChatPage from './ChatPage.jsx';

const user = {
  email: 'ops@prueba.test',
  role: 'operaciones',
  merchants: [{ id: 1, name: 'Tienda La 80' }],
};

function jsonResponse(status, body) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
}

function renderChat(props = {}) {
  return render(<ChatPage token="t" user={user} onLogout={vi.fn()} {...props} />);
}

afterEach(() => vi.unstubAllGlobals());

describe('ChatPage', () => {
  it('muestra el estado vacio con preguntas de ejemplo', () => {
    renderChat();
    expect(screen.getByText(/pregunta sobre entregas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /semana pasada/i })).toBeInTheDocument();
  });

  it('envia la pregunta, muestra la carga y luego la respuesta con los datos consultados', async () => {
    let resolve;
    const fetchMock = vi.fn(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderChat();

    await userEvent.type(screen.getByLabelText('Mensaje'), '¿Cuánto facturó Tienda La 80?{Enter}');

    expect(screen.getByRole('status', { name: /respondiendo/i })).toBeInTheDocument();
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/agent\/chat$/);
    expect(options.headers.Authorization).toBe('Bearer t');
    expect(JSON.parse(options.body)).toEqual({
      message: '¿Cuánto facturó Tienda La 80?',
      history: [],
    });

    resolve(
      await jsonResponse(200, {
        reply: 'Tienda La 80 facturó 6.334 COP en 1 entregas terminadas.',
        verified: true,
        toolCalls: [
          { name: 'get_merchant_totals', input: { merchant_id: 1 }, output: { totals: [] } },
        ],
      }),
    );

    expect(await screen.findByText(/facturó 6\.334 COP/)).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Datos consultados (1)')).toBeInTheDocument();
    expect(screen.getByText('get_merchant_totals')).toBeInTheDocument();
  });

  it('muestra el error y permite reintentar sin duplicar la pregunta', async () => {
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(
        jsonResponse(502, { error: { message: 'El asistente no esta disponible ahora.' } }),
      )
      .mockReturnValueOnce(jsonResponse(200, { reply: 'Listo.', verified: true, toolCalls: [] }));
    vi.stubGlobal('fetch', fetchMock);
    renderChat();

    await userEvent.type(screen.getByLabelText('Mensaje'), 'hola{Enter}');
    expect(await screen.findByText('El asistente no esta disponible ahora.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Listo.')).toBeInTheDocument();
    expect(screen.getAllByText('hola')).toHaveLength(1);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).history).toEqual([]);
  });

  it('marca las respuestas con cifras sin verificar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse(200, { reply: 'datos crudos', verified: false, toolCalls: [] })),
    );
    renderChat();

    await userEvent.type(screen.getByLabelText('Mensaje'), 'x{Enter}');

    expect(await screen.findByText(/cifras sin verificar/i)).toBeInTheDocument();
  });

  it('cierra la sesion si el token ya no es valido', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse(401, { error: { message: 'Token invalido' } })),
    );
    const onLogout = vi.fn();
    renderChat({ onLogout });

    await userEvent.type(screen.getByLabelText('Mensaje'), 'x{Enter}');

    await vi.waitFor(() => expect(onLogout).toHaveBeenCalled());
  });
});
