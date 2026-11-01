import { formatAmount, formatDay, formatInstant, formatStatus } from './format.js';

// Los textos de terceros llegan entre delimitadores para el modelo; la
// interfaz nunca los muestra.
const MARKERS = /<<<[a-z_]*>>>|<<<|>>>/g;

export function stripMarkers(text) {
  return String(text).replace(MARKERS, '').trim();
}

// Nombre en lenguaje comun de lo que consulto el servidor (nunca el nombre
// interno de la herramienta).
const TOOL_LABELS = {
  list_merchants: 'Comercios a los que tienes acceso',
  resolve_period: 'Periodo consultado',
  get_merchant_totals: 'Facturación del periodo',
  get_courier_status_counts: 'Entregas del mensajero por estado',
  search_deliveries: 'Búsqueda de entregas',
  explain_cost: 'Detalle del costo de una entrega',
  get_merchant_notes: 'Notas del comercio',
};

export function toolLabel(name) {
  return TOOL_LABELS[name] ?? 'Consulta al sistema';
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

const UNIT_NOTE = 'Montos en la unidad mínima de cada moneda (por ejemplo, centavos en MXN).';

const BREAKDOWN_LABELS = {
  base: 'Tarifa base',
  distance: 'Por distancia',
  nightSurcharge: 'Recargo nocturno',
};

// Resumen legible de lo que devolvieron las tools: bloques con titulo y filas
// { label, value }. Nunca JSON ni nombres internos.
export function buildSummary(toolCalls) {
  const blocks = [];
  for (const call of toolCalls ?? []) {
    const out = call.output;
    if (!out || call.error) continue;

    if (call.name === 'list_merchants') {
      blocks.push({
        kind: call.name,
        title: toolLabel(call.name),
        rows: (out.merchants ?? []).map((m) => ({
          label: String(m.name ?? ''),
          value: String(m.time_zone ?? ''),
        })),
      });
    } else if (call.name === 'resolve_period') {
      blocks.push({
        kind: call.name,
        title: toolLabel(call.name),
        rows: [
          { label: 'Desde', value: formatDay(out.from) },
          { label: 'Hasta', value: formatDay(out.last_day) },
          { label: 'Zona horaria', value: String(out.time_zone ?? '') },
        ],
      });
    } else if (call.name === 'get_merchant_totals') {
      blocks.push({
        kind: call.name,
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
        kind: call.name,
        title: String(out.courier_name ?? 'Mensajero'),
        subtitle: 'Entregas por estado',
        rows: Object.entries(out.counts ?? {}).map(([status, n]) => ({
          label: formatStatus(status),
          value: formatAmount(n),
        })),
      });
    } else if (call.name === 'search_deliveries') {
      blocks.push({
        kind: call.name,
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
        kind: call.name,
        title: `Entrega ${out.delivery_id}`,
        subtitle: out.completed_at ? formatInstant(out.completed_at) : formatStatus(out.status),
        note: UNIT_NOTE,
        rows: [
          { label: 'Costo total', value: formatAmount(out.amount, out.currency) },
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
