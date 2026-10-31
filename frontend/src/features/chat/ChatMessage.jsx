import Badge from '../../components/ui/Badge.jsx';
import { extractNotes, stripMarkers } from '../../lib/summary.js';
import NoteQuote from './NoteQuote.jsx';
import ToolCallsPanel from './ToolCallsPanel.jsx';

// Cortes del agente (limite de pasos, de uso, rechazo): no hubo nada que verificar.
const ABNORMAL_STOPS = new Set(['max_steps', 'token_limit', 'refusal']);

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  const notes = isUser ? null : extractNotes(message.toolCalls);
  const unverified = !isUser && message.verified === false;
  const simulated = !isUser && message.provider === 'fake';
  const verified = !isUser && message.verified === true && !ABNORMAL_STOPS.has(message.stopReason);

  return (
    <li className={`anim-subir flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      <span className="px-2 text-xs font-semibold text-tinta-tenue">
        {isUser ? 'Tú' : 'Asistente'}
      </span>
      <article
        aria-label={isUser ? 'Tu mensaje' : 'Respuesta del asistente'}
        className={`max-w-[92%] rounded-tarjeta px-5 py-4 sm:max-w-[85%] ${
          isUser
            ? 'rounded-tr-md bg-violeta text-white'
            : 'rounded-tl-md border border-borde bg-lila-claro text-tinta'
        }`}
      >
        {/* Texto plano: React escapa el contenido, nunca se interpreta como HTML. */}
        <p className="whitespace-pre-wrap break-words">{stripMarkers(message.text)}</p>
        {(verified || unverified || simulated) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {verified && (
              <Badge
                tone="success"
                title="Las cifras de esta respuesta coinciden con los datos del sistema"
              >
                ✓ Verificado
              </Badge>
            )}
            {unverified && (
              <Badge
                tone="warning"
                title="No se pudo confirmar el texto del asistente; se muestran los datos del sistema"
              >
                Cifras sin verificar
              </Badge>
            )}
            {simulated && (
              <Badge
                tone="neutral"
                title="Respuesta generada por reglas, no por un modelo de IA. Configura LLM_PROVIDER para usar un modelo real."
              >
                Modo simulado
              </Badge>
            )}
          </div>
        )}
        {notes && <NoteQuote {...notes} />}
        {!isUser && <ToolCallsPanel toolCalls={message.toolCalls} unverified={unverified} />}
      </article>
    </li>
  );
}
