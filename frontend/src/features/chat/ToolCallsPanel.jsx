import { useState } from 'react';
import { buildSummary, describeCalls, toolLabel, visibleToolCalls } from '../../lib/summary.js';
import Summary from './Summary.jsx';

// "Datos consultados": una linea discreta que dice que se consulto en el
// sistema, con "Ver detalle" para abrir las tarjetas. Se abre sola solo cuando
// los datos SON la respuesta: una lista de busqueda o cifras sin verificar.
// Siempre en palabras: nunca JSON ni nombres internos. Las notas del comercio
// se muestran aparte, como cita.
export default function ToolCallsPanel({ toolCalls, unverified = false }) {
  const calls = visibleToolCalls(toolCalls);
  const failed = calls.filter((c) => c.error);
  const cards = calls.filter((c) => !c.error && c.name !== 'get_merchant_notes');
  const dataIsTheAnswer = unverified || cards.some((c) => c.name === 'search_deliveries');
  const [open, setOpen] = useState(dataIsTheAnswer);
  const captions = describeCalls(calls);

  if (captions.length === 0 && failed.length === 0) return null;

  return (
    <section aria-label="Datos consultados" className="mt-3 border-t border-borde pt-2">
      {captions.length > 0 && (
        <p className="text-xs text-tinta-tenue">
          <span className="font-semibold">Datos consultados:</span> {captions.join(' · ')}
          {cards.length > 0 && (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="ml-2 cursor-pointer font-semibold text-violeta underline underline-offset-2"
            >
              {open ? 'Ocultar detalle' : 'Ver detalle'}
            </button>
          )}
        </p>
      )}
      {failed.map((call, index) => (
        <p
          key={`${call.name}-${index}`}
          className="mt-2 rounded-2xl bg-aviso-fondo px-4 py-2 text-sm text-aviso"
        >
          {toolLabel(call.name)}: la consulta no devolvió datos (no tienes acceso a ese dato o no
          existe).
        </p>
      ))}
      {open && cards.length > 0 && (
        <div>
          {cards.map((call, index) => (
            <Summary key={`${call.name}-${index}`} blocks={buildSummary([call])} />
          ))}
        </div>
      )}
    </section>
  );
}
