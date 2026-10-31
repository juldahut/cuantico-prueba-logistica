import Badge from '../../components/ui/Badge.jsx';
import { formatDuration } from '../../lib/format.js';
import { buildSummary } from '../../lib/summary.js';
import JsonView from './JsonView.jsx';
import Summary from './Summary.jsx';

// "Datos consultados": las tools que ejecuto el servidor para esta respuesta,
// estilo consola. El bloque completo y cada JSON van plegados por defecto.
export default function ToolCallsPanel({ toolCalls }) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <details className="mt-4 rounded-2xl border border-lila/15 bg-morado/60 font-mono text-xs">
      <summary className="cursor-pointer select-none px-4 py-2.5 font-bold text-lavanda">
        Datos consultados ({toolCalls.length})
      </summary>
      <ol className="flex flex-col gap-2 px-3 pb-3">
        {toolCalls.map((call, index) => {
          const duration = formatDuration(call.durationMs);
          return (
            <li key={`${call.name}-${index}`}>
              <details className="rounded-2xl border border-lila/10 bg-noche-elevada">
                <summary className="flex cursor-pointer select-none flex-wrap items-center gap-2 px-3 py-2">
                  <span className="font-bold text-lila-claro">{call.name}</span>
                  {call.error ? (
                    <Badge tone="danger">error: {call.error}</Badge>
                  ) : (
                    <Badge tone="success">ok</Badge>
                  )}
                  {duration && <span className="ml-auto text-lavanda-tenue">{duration}</span>}
                </summary>
                <div className="px-3 pb-3 font-cuerpo text-sm">
                  {call.error && (
                    <p className="text-error">La consulta no devolvió datos ({call.error}).</p>
                  )}
                  <Summary blocks={buildSummary([call])} />
                  <details className="mt-2">
                    <summary className="cursor-pointer select-none font-mono text-xs text-lavanda-tenue">
                      Ver JSON técnico
                    </summary>
                    <div className="mt-2">
                      <JsonView
                        value={{ entrada: call.input ?? {}, resultado: call.output ?? null }}
                      />
                    </div>
                  </details>
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
