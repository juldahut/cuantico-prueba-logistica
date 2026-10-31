import { formatAmount, formatDay, formatInstant, formatStatus } from './format.js';

// Los textos de terceros llegan entre delimitadores para el modelo; la
// interfaz nunca los muestra.
const MARKERS = /<<<(?:fin_)?texto_del_comercio>>>/g;

export function stripMarkers(text) {
  return String(text).replace(MARKERS, '').trim();
}

// Notas del comercio como dato: { merchantName, notes, instructions }.
export function extractNotes(toolCalls) {
  const call = (toolCalls ?? []).find(
    (c) => c.name === 'get_merchant_notes' && typeof c.output?.untrusted_text === 'string',
  );
  if (!call) return null;
  // Formato fijo del servidor: "Notas: ...", salto de linea, "Instrucciones de
  // entrega: ...". Las instrucciones van al final: se corta en la ultima
  // etiqueta, asi una nota multilinea (o que imite la etiqueta) no desplaza
  // los campos.
  const body = stripMarkers(call.output.untrusted_text);
  const label = '\nInstrucciones de entrega:';
  const cut = body.lastIndexOf(label);
  const head = cut === -1 ? body : body.slice(0, cut);
  const instructions = cut === -1 ? '' : body.slice(cut + label.length).trim();
  const notes = head.replace(/^Notas:/, '').trim();
  return {
    merchantName: String(call.output.merchant_name ?? ''),
    notes,
    instructions,
  };
}

// Resumen legible de lo que devolvieron las tools: filas { label, value }
// agrupadas en bloques con titulo. Es lo que se muestra cuando las cifras del
// modelo no se pudieron verificar (en lugar del JSON crudo).
const UNIT_NOTE = 'Montos en la unidad mínima de cada moneda (por ejemplo, centavos en MXN).';

const BREAKDOWN_LABELS = {
  base: 'Base',
  distance: 'Distancia',
  nightSurcharge: 'Recargo nocturno',
};

export function buildSummary(toolCalls) {
  const blocks = [];
  for (const call of toolCalls ?? []) {
    const out = call.output;
    if (!out || call.error) continue;

    if (call.name === 'get_merchant_totals') {
      blocks.push({
        title: String(out.merchant_name ?? 'Comercio'),
        subtitle: `Del ${formatDay(out.from)} al ${formatDay(out.last_day)}`,
        note: UNIT_NOTE,
        rows: [
          { label: 'Entregas terminadas', value: formatAmount(out.deliveries) },
          ...(out.totals ?? []).map((t) => ({
            label: 'Facturado',
            value: formatAmount(t.amount, t.currency),
          })),
        ],
      });
    } else if (call.name === 'get_courier_status_counts') {
      blocks.push({
        title: String(out.courier_name ?? 'Mensajero'),
        subtitle: 'Entregas por estado',
        rows: Object.entries(out.counts ?? {}).map(([status, n]) => ({
          label: formatStatus(status),
          value: formatAmount(n),
        })),
      });
    } else if (call.name === 'search_deliveries') {
      blocks.push({
        title: `Entregas encontradas (${out.count ?? 0})`,
        rows: (out.results ?? []).map((r) => ({
          label: `${r.delivery_id} · ${formatStatus(r.status)}`,
          value: String(r.address ?? ''),
          hint: r.cost_amount == null ? null : formatAmount(r.cost_amount, r.currency),
        })),
      });
    } else if (call.name === 'explain_cost') {
      const breakdown = out.calculation?.breakdown ?? {};
      blocks.push({
        title: `Entrega ${out.delivery_id}`,
        subtitle: out.completed_at ? formatInstant(out.completed_at) : formatStatus(out.status),
        note: UNIT_NOTE,
        rows: [
          { label: 'Costo', value: formatAmount(out.amount, out.currency) },
          ...Object.entries(breakdown)
            .filter(([, v]) => Number.isFinite(v))
            .map(([k, v]) => ({
              label: BREAKDOWN_LABELS[k] ?? k,
              value: formatAmount(v, out.currency),
            })),
        ],
      });
    }
  }
  return blocks;
}
