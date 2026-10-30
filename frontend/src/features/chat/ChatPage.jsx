import { useEffect, useRef, useState } from 'react';
import { apiPost } from '../../lib/api.js';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Label from '../../components/ui/Label.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import ChatMessage from './ChatMessage.jsx';

const MAX_MESSAGE = 1000;
const MAX_HISTORY = 10;

const EXAMPLES = [
  '¿Cuánto facturó Tienda La 80 la semana pasada?',
  '¿Qué notas tiene Tienda La 80?',
  'Busca Calle',
];

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
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages, loading]);

  // retrying: reemplaza la pregunta que fallo en lugar de repetirla.
  async function send(text, { retrying = false } = {}) {
    const question = text.trim();
    if (!question || loading) return;

    // Historial: solo texto de los ultimos turnos; el servidor no acepta mas.
    const base = retrying ? messages.slice(0, -1) : messages;
    const history = base
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.text.slice(0, 2000) }));

    setMessages([...base, { id: newId(), role: 'user', text: question }]);
    setDraft('');
    setError(null);
    setLastQuestion(question);
    setLoading(true);

    try {
      const res = await apiPost('/agent/chat', { message: question, history }, token);
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: 'assistant',
          text: res.reply,
          verified: res.verified,
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
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-6">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Asistente de operaciones</h1>
          <p className="text-xs text-ink-muted">
            {user.email} · {user.role}
            {user.merchants?.length ? ` · ${user.merchants.map((m) => m.name).join(', ')}` : ''}
          </p>
        </div>
        <Button variant="secondary" onClick={onLogout}>
          Salir
        </Button>
      </header>

      <section aria-label="Conversación" className="flex-1">
        {messages.length === 0 && !loading ? (
          <EmptyState
            title="Pregunta sobre entregas, costos o comercios"
            description="Las cifras salen de consultas al sistema; el asistente no las calcula."
            action={
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((example) => (
                  <Button key={example} variant="secondary" onClick={() => send(example)}>
                    {example}
                  </Button>
                ))}
              </div>
            }
          />
        ) : (
          <ol aria-live="polite" className="flex flex-col gap-3">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </ol>
        )}

        {loading && (
          <div
            role="status"
            aria-label="El asistente está respondiendo"
            className="mt-3 flex flex-col gap-2"
          >
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {error && (
          <div className="mt-3">
            <ErrorState message={error} onRetry={retry} />
          </div>
        )}
        <div ref={endRef} />
      </section>

      <form
        className="sticky bottom-0 mt-4 flex flex-col gap-2 bg-canvas pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <Label htmlFor="message" className="sr-only">
          Mensaje
        </Label>
        <div className="flex gap-2">
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
            className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted"
          />
          <Button type="submit" loading={loading} disabled={!draft.trim()}>
            Enviar
          </Button>
        </div>
      </form>
    </div>
  );
}
