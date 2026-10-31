import { useEffect, useRef, useState } from 'react';
import { apiPost } from '../../lib/api.js';
import Button from '../../components/ui/Button.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Label from '../../components/ui/Label.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Thinking from '../../components/Thinking.jsx';
import Wordmark from '../../components/Wordmark.jsx';
import ChatMessage from './ChatMessage.jsx';

const MAX_MESSAGE = 1000;
const MAX_HISTORY = 10;
const DELAYS = ['retardo-2', 'retardo-3', 'retardo-4'];
const ROLES = { admin: 'Administrador', operaciones: 'Operaciones' };

// Preguntas de ejemplo por tema. Usan el primer comercio del usuario, si tiene.
function topicsFor(user) {
  const merchant = user.merchants?.[0]?.name;
  const of = merchant ? ` ${merchant}` : ' mi comercio';
  return [
    {
      title: 'Facturación',
      description: 'Cuánto facturó un comercio en un periodo.',
      questions: [
        `¿Cuánto facturó${of} la semana pasada?`,
        `¿Cuánto facturó${of} del 19 al 25 de octubre de 2026?`,
      ],
    },
    {
      title: 'Mensajeros',
      description: 'Cuántas entregas tiene un mensajero y en qué estado.',
      questions: ['Entregas del mensajero 1 por estado'],
    },
    {
      title: 'Entregas y notas',
      description: 'Busca una entrega por calle o barrio, o lee las notas de un comercio.',
      questions: ['Busca Calle', `¿Qué notas tiene${of}?`],
    },
  ];
}

let nextId = 0;
const newId = () => {
  nextId += 1;
  return nextId;
};

export default function ChatPage({ token, user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState(null);
  const [lastQuestion, setLastQuestion] = useState(null);
  const endRef = useRef(null);
  const topics = topicsFor(user);
  const merchants = user.merchants ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages, loading]);

  // retrying: reemplaza la pregunta que fallo en lugar de repetirla.
  async function send(text, { retrying = false } = {}) {
    const question = text.trim();
    if (!question || loading) return;

    // Historial: solo las ultimas preguntas del usuario. El servidor no acepta
    // turnos del asistente enviados por el cliente.
    const base = retrying ? messages.slice(0, -1) : messages;
    const history = base
      .filter((m) => m.role === 'user' && typeof m.text === 'string')
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: 'user', content: m.text.slice(0, MAX_MESSAGE) }));

    setMessages([...base, { id: newId(), role: 'user', text: question }]);
    setDraft('');
    setError(null);
    setLastQuestion(question);
    setLoading(true);

    try {
      const res = await apiPost('/agent/chat', { message: question, history }, token);
      setProvider(res.provider ?? null);
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          text: typeof res.reply === 'string' ? res.reply : '',
          verified: res.verified,
          stopReason: res.stopReason,
          toolCalls: res.toolCalls,
          provider: res.provider,
        },
      ]);
    } catch (err) {
      if (err.status === 401) {
        onLogout();
        return;
      }
      // 429 (limite de uso): reintentar al instante solo agrava el limite.
      setError({ message: err.message, retryable: err.status !== 429 });
    } finally {
      setLoading(false);
    }
  }

  function retry() {
    send(lastQuestion, { retrying: true });
  }

  function reset() {
    if (loading) return;
    setMessages([]);
    setError(null);
    setDraft('');
  }

  const started = messages.length > 0 || loading;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Cabecera y franja de contexto fijas: no se pierden al hacer varias consultas. */}
      <div className="sticky top-0 z-30 shadow-tarjeta">
        <header className="sobre-oscuro relative isolate overflow-hidden bg-morado text-white">
          <div
            className="orbe orbe-violeta -left-16 -top-24 -z-10 h-56 w-56 opacity-40"
            aria-hidden="true"
          />
          <div
            className="orbe orbe-cian -right-10 -top-28 -z-10 h-48 w-48 opacity-25"
            aria-hidden="true"
          />
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <Wordmark />
              <p className="text-xs text-lavanda">Asistente de operaciones</p>
            </div>
            <div className="flex items-center gap-2">
              {started && (
                <Button variant="onDark" onClick={reset} disabled={loading}>
                  Nueva conversación
                </Button>
              )}
              <Button variant="onDark" onClick={onLogout}>
                Salir
              </Button>
            </div>
          </div>
          <div className="linea-marca" aria-hidden="true" />
        </header>

        <div className="border-b border-borde bg-lila-claro">
          <p className="mx-auto max-w-4xl px-4 py-2 text-sm text-tinta-suave">
            <span className="font-semibold">{user.email}</span> · {ROLES[user.role] ?? user.role}
            {merchants.length > 0 && (
              <>
                {' '}
                · Consultas de{' '}
                <span className="font-semibold">{merchants.map((m) => m.name).join(', ')}</span>
                {merchants.length === 1 && merchants[0].timeZone && (
                  <span> (hora de {merchants[0].timeZone})</span>
                )}
              </>
            )}
          </p>
          {provider === 'fake' && (
            <p className="mx-auto max-w-4xl px-4 pb-2 text-sm font-semibold text-aviso">
              Modo simulado: las respuestas las arman reglas, no un modelo de IA
            </p>
          )}
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <h1 className="sr-only">Asistente de operaciones</h1>
        <section aria-label="Conversación" className="flex-1">
          {!started ? (
            <div className="anim-subir">
              <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] text-tinta">
                ¿Qué quieres saber de tus entregas?
              </h2>
              <p className="mt-3 max-w-xl text-tinta-suave">
                Escribe tu pregunta como se la harías a una persona. El asistente consulta el
                sistema y te responde. Solo lee datos: no cambia nada.
              </p>
              <ul className="mt-6 grid gap-4 sm:grid-cols-3">
                {topics.map((topic, index) => (
                  <li
                    key={topic.title}
                    className={`anim-subir flex flex-col gap-3 rounded-tarjeta border border-borde p-4 shadow-tarjeta transition-transform duration-200 ease-estandar hover:-translate-y-1 ${DELAYS[index] ?? ''}`}
                  >
                    <div>
                      <h3 className="text-lg text-tinta">{topic.title}</h3>
                      <p className="text-sm text-tinta-tenue">{topic.description}</p>
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                      {topic.questions.map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => send(question)}
                          className="cursor-pointer rounded-2xl border border-violeta/30 px-3 py-2 text-left text-sm text-violeta transition-colors duration-150 hover:bg-lila-claro"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-tinta-tenue">
                <span className="font-semibold text-exito">✓ Verificado</span> significa que las
                cifras de la respuesta coinciden con los datos del sistema. Bajo cada respuesta
                verás «Datos consultados»: lo que se consultó en el sistema.
              </p>
            </div>
          ) : (
            <ol aria-live="polite" className="flex flex-col gap-5">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </ol>
          )}

          {loading && (
            <div className="mt-5 flex flex-col gap-3">
              <Thinking />
              <div className="flex flex-col gap-2" aria-hidden="true">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-5">
              <ErrorState message={error.message} onRetry={error.retryable ? retry : undefined} />
            </div>
          )}
          <div ref={endRef} />
        </section>

        <form
          className="sticky bottom-0 mt-4 flex flex-col gap-2 border-t border-borde bg-white pb-3 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          {messages.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" aria-label="Preguntas sugeridas">
              <span className="text-xs font-semibold text-tinta-tenue">Prueba también:</span>
              {topics.map((topic) => (
                <button
                  key={topic.title}
                  type="button"
                  disabled={loading}
                  onClick={() => send(topic.questions[0])}
                  className="cursor-pointer rounded-full border border-violeta/30 px-3 py-1 text-xs font-semibold text-violeta transition-colors duration-150 hover:bg-lila-claro disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {topic.title}
                </button>
              ))}
            </div>
          )}
          <Label htmlFor="message" className="sr-only">
            Mensaje
          </Label>
          <div className="flex items-end gap-2">
            <textarea
              id="message"
              rows={2}
              maxLength={MAX_MESSAGE}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              placeholder="Escribe tu pregunta, por ejemplo: ¿Cuánto facturó mi comercio la semana pasada?"
              className="w-full resize-none rounded-3xl border border-borde bg-white px-5 py-3 text-base text-tinta placeholder:text-tinta-tenue focus:border-violeta"
            />
            <Button type="submit" loading={loading} disabled={!draft.trim()}>
              Enviar
            </Button>
          </div>
          <p className="text-xs text-tinta-tenue">
            Enter envía · Shift + Enter agrega una línea
            {draft.length > 800 && ` · ${draft.length}/${MAX_MESSAGE} caracteres`}
          </p>
        </form>
      </main>
    </div>
  );
}
