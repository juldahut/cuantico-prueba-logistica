import { useEffect, useRef, useState } from 'react';
import { apiPost } from '../../lib/api.js';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Label from '../../components/ui/Label.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Thinking from '../../components/Thinking.jsx';
import ChatMessage from './ChatMessage.jsx';
import Sidebar from './Sidebar.jsx';

const MAX_MESSAGE = 1000;
const MAX_HISTORY = 10;

// Preguntas sugeridas: usan el primer comercio del usuario, si tiene.
function suggestionsFor(user) {
  const merchant = user.merchants?.[0]?.name;
  const of = merchant ? ` ${merchant}` : ' mi comercio';
  return [
    {
      label: 'Facturación del 19 al 25 de octubre',
      question: `¿Cuánto facturó${of} del 19 al 25 de octubre de 2026?`,
    },
    {
      label: 'Facturación de la semana pasada',
      question: `¿Cuánto facturó${of} la semana pasada?`,
    },
    {
      label: 'Entregas por estado del mensajero 1',
      question: 'Entregas del mensajero 1 por estado',
    },
    { label: 'Notas del comercio', question: `¿Qué notas tiene${of}?` },
    { label: 'Buscar entrega', question: 'Busca Calle' },
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
  const [lastQuestion, setLastQuestion] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const endRef = useRef(null);
  const suggestions = suggestionsFor(user);

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
    setMenuOpen(false);

    try {
      const res = await apiPost('/agent/chat', { message: question, history }, token);
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          text: typeof res.reply === 'string' ? res.reply : '',
          verified: res.verified,
          stopReason: res.stopReason,
          toolCalls: res.toolCalls,
        },
      ]);
    } catch (err) {
      if (err.status === 401) {
        onLogout();
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function retry() {
    send(lastQuestion, { retrying: true });
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-clip lg:flex-row">
      <div
        className="orbe orbe-violeta -right-32 top-10 -z-10 h-96 w-96 opacity-30"
        aria-hidden="true"
      />
      <Sidebar
        user={user}
        open={menuOpen}
        onToggle={() => setMenuOpen((v) => !v)}
        suggestions={suggestions}
        onPick={send}
        onLogout={onLogout}
        disabled={loading}
      />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <h1 className="sr-only">Asistente de operaciones</h1>
        <section aria-label="Conversación" className="flex-1">
          {messages.length === 0 && !loading ? (
            <EmptyState
              title="Pregunta sobre entregas, costos o comercios"
              description="Las cifras salen de consultas al sistema; el asistente no las calcula."
              action={
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {suggestions.slice(0, 3).map((s) => (
                    <Button key={s.label} variant="secondary" onClick={() => send(s.question)}>
                      {s.label}
                    </Button>
                  ))}
                </div>
              }
            />
          ) : (
            <ol aria-live="polite" className="flex flex-col gap-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </ol>
          )}

          {loading && (
            <div className="mt-4 flex flex-col gap-3">
              <Thinking />
              <div className="flex flex-col gap-2" aria-hidden="true">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4">
              <ErrorState message={error} onRetry={retry} />
            </div>
          )}
          <div ref={endRef} />
        </section>

        <form
          className="sticky bottom-0 mt-4 flex flex-col gap-2 bg-noche pb-2 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
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
              placeholder="Escribe tu pregunta (Enter para enviar)"
              className="w-full resize-none rounded-3xl border border-lila/25 bg-noche-elevada px-5 py-3 text-base text-lila-claro placeholder:text-lavanda-tenue"
            />
            <Button type="submit" variant="accent" loading={loading} disabled={!draft.trim()}>
              Enviar
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
