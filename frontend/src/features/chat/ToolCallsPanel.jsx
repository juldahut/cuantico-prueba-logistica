import { buildSummary, toolLabel } from '../../lib/summary.js';
import Summary from './Summary.jsx';

// "Datos consultados": que le pidio el servidor al sistema para armar esta
// respuesta, en palabras. Plegado por defecto; sin JSON ni nombres internos.
export default function ToolCallsPanel({ toolCalls }) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <details className="mt-4 rounded-2xl border border-borde bg-white text-sm">
      <summary
        className="cursor-pointer select-none px-4 py-2.5 font-semibold text-violeta"
        title="Lo que se consultó en el sistema para responderte"
      >
        Datos consultados ({toolCalls.length})
      </summary>
      <ol className="flex flex-col gap-1 px-4 pb-4">
        {toolCalls.map((call, index) => (
          <li key={`${call.name}-${index}`} className="border-t border-borde pt-3 first:border-t-0">
            <p className="font-semibold text-tinta">
              {toolLabel(call.name)}
              {call.error && <span className="ml-2 font-normal text-error">· sin resultado</span>}
            </p>
            {call.error ? (
              <p className="text-tinta-tenue">
                La consulta no devolvió datos: no tienes acceso a ese dato o no existe.
              </p>
            ) : call.name === 'get_merchant_notes' ? (
              <p className="text-tinta-tenue">Las notas se muestran arriba, como cita.</p>
            ) : (
              <Summary blocks={buildSummary([call])} />
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
