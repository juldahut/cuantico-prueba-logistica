import Badge from '../../components/ui/Badge.jsx';
import ToolCallsPanel from './ToolCallsPanel.jsx';

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <li className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <article
        aria-label={isUser ? 'Tu mensaje' : 'Respuesta del asistente'}
        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm shadow-sm ${
          isUser ? 'bg-accent text-accent-ink' : 'border border-border bg-surface text-ink'
        }`}
      >
        {/* Texto plano: React escapa el contenido, nunca se interpreta como HTML. */}
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        {!isUser && message.verified === false && (
          <Badge tone="danger" className="mt-2">
            Cifras sin verificar: se muestran los datos crudos
          </Badge>
        )}
        {!isUser && <ToolCallsPanel toolCalls={message.toolCalls} />}
      </article>
    </li>
  );
}
