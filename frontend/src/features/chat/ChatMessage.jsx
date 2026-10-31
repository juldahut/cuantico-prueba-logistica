import Badge from '../../components/ui/Badge.jsx';
import { buildSummary, extractNotes, stripMarkers } from '../../lib/summary.js';
import NoteQuote from './NoteQuote.jsx';
import Summary from './Summary.jsx';
import ToolCallsPanel from './ToolCallsPanel.jsx';

// Cortes del agente (limite de pasos, de uso, rechazo): no hubo nada que verificar.
const ABNORMAL_STOPS = new Set(['max_steps', 'token_limit', 'refusal']);

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const notes = isUser ? null : extractNotes(message.toolCalls);
  const unverified = !isUser && message.verified === false;
  const verified = !isUser && message.verified === true && !ABNORMAL_STOPS.has(message.stopReason);
  const summary = unverified ? buildSummary(message.toolCalls) : [];

  return (
    <li className={`anim-subir flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <article
        aria-label={isUser ? 'Tu mensaje' : 'Respuesta del asistente'}
        className={`max-w-[92%] rounded-tarjeta px-5 py-4 sm:max-w-[85%] ${
          isUser ? 'bg-violeta text-white' : 'borde-degradado text-lila-claro'
        }`}
      >
        {/* Texto plano: React escapa el contenido, nunca se interpreta como HTML. */}
        <p className="whitespace-pre-wrap break-words">{stripMarkers(message.text)}</p>
        {(verified || unverified) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {verified && <Badge tone="success">✓ Verificado</Badge>}
            {unverified && <Badge tone="warning">Cifras sin verificar</Badge>}
          </div>
        )}
        {notes && <NoteQuote {...notes} />}
        <Summary blocks={summary} />
        {!isUser && <ToolCallsPanel toolCalls={message.toolCalls} />}
      </article>
    </li>
  );
}
