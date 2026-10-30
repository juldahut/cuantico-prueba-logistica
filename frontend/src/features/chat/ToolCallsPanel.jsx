import Badge from '../../components/ui/Badge.jsx';

// "Datos consultados": las tools que ejecuto el servidor para esta respuesta,
// con su entrada y su resultado. Plegado por defecto.
export default function ToolCallsPanel({ toolCalls }) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <details className="mt-3 rounded-md border border-border bg-surface-muted/60 text-xs">
      <summary className="cursor-pointer select-none px-3 py-2 font-medium text-ink-muted">
        Datos consultados ({toolCalls.length})
      </summary>
      <ol className="flex flex-col gap-3 px-3 pb-3">
        {toolCalls.map((call, index) => (
          <li key={`${call.name}-${index}`} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <code className="font-semibold text-ink">{call.name}</code>
              {call.error ? (
                <Badge tone="danger">{call.error}</Badge>
              ) : (
                <Badge tone="success">ok</Badge>
              )}
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-surface p-2 text-ink-muted">
              {JSON.stringify({ entrada: call.input, resultado: call.output ?? null }, null, 2)}
            </pre>
          </li>
        ))}
      </ol>
    </details>
  );
}
