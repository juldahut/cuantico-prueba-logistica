'use strict';

// Modelo simulado, determinista y por reglas. Sirve para tests y para correr el
// proyecto sin llave de API. Habla el mismo formato que la API de mensajes
// (bloques text / tool_use) y, como un modelo real, solo orquesta: elige tools
// y redacta con lo que estas devuelven. No calcula nada.

function normalize(text) {
  return String(text).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function detectIntent(question) {
  const q = normalize(question);
  if (/\bnotas?\b|instruccion/.test(q)) return 'notes';
  if (/mensajero\s+(\d+)/.test(q)) return 'courier';
  if (/(costo|desglose).*entrega\s+([a-z0-9_-]+)/i.test(q)) return 'explain';
  if (/^(busca|buscar|encuentra)\b/.test(q)) return 'search';
  if (/factur|total|cobr|cuanto/.test(q)) return 'totals';
  return 'help';
}

function detectPeriod(question) {
  const q = normalize(question);
  const dates = q.match(/\d{4}-\d{2}-\d{2}/g);
  if (dates && dates.length >= 2) {
    return { expression: 'rango', start_date: dates[0], end_date: dates[1] };
  }
  const options = [
    ['semana pasada', 'semana_pasada'],
    ['esta semana', 'esta_semana'],
    ['mes pasado', 'mes_pasado'],
    ['este mes', 'este_mes'],
    ['ayer', 'ayer'],
    ['hoy', 'hoy'],
  ];
  const found = options.find(([text]) => q.includes(text));
  return { expression: found ? found[1] : 'ultimos_7_dias', start_date: null, end_date: null };
}

// Pares (tool_use, resultado) del turno actual, en orden.
function currentTurn(messages) {
  const start = messages.findLastIndex((m) => m.role === 'user' && typeof m.content === 'string');
  const question = messages[start].content;
  const results = [];
  for (let i = start + 1; i < messages.length; i += 1) {
    const m = messages[i];
    if (m.role !== 'assistant') continue;
    const uses = m.content.filter((b) => b.type === 'tool_use');
    const answers = Array.isArray(messages[i + 1]?.content) ? messages[i + 1].content : [];
    for (const use of uses) {
      const answer = answers.find((a) => a.tool_use_id === use.id);
      results.push({
        name: use.name,
        isError: Boolean(answer?.is_error),
        data: answer ? JSON.parse(answer.content) : null,
      });
    }
  }
  return { question, results };
}

const fmt = (n) => Number(n).toLocaleString('es-CO');

let counter = 0;
function toolUse(name, input) {
  counter += 1;
  return {
    stop_reason: 'tool_use',
    content: [{ type: 'tool_use', id: `fake_${counter}`, name, input }],
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}

function say(text) {
  return {
    stop_reason: 'end_turn',
    content: [{ type: 'text', text }],
    usage: { input_tokens: 0, output_tokens: 0 },
  };
}

function findMerchant(question, listResult) {
  const q = normalize(question);
  return (listResult?.merchants || []).find((m) => q.includes(normalize(m.name)));
}

function next(question, results) {
  const intent = detectIntent(question);
  const last = results.at(-1);
  if (last?.isError) {
    return say('No tienes acceso a ese dato o no existe.');
  }

  if (intent === 'courier') {
    const id = Number(normalize(question).match(/mensajero\s+(\d+)/)[1]);
    if (!last) return toolUse('get_courier_status_counts', { courier_id: id });
    const parts = Object.entries(last.data.counts).map(([status, n]) => `${status}: ${n}`);
    return say(
      `Entregas de ${last.data.courier_name} por estado: ${parts.join(', ') || 'ninguna'}.`,
    );
  }

  if (intent === 'explain') {
    const id = question.match(/entrega\s+([A-Za-z0-9_-]+)/i)[1];
    if (!last) return toolUse('explain_cost', { delivery_id: id });
    const d = last.data;
    if (d.amount === null)
      return say(`La entrega ${d.delivery_id} no tiene costo calculado (${d.cost_status}).`);
    const b = d.calculation.breakdown;
    return say(
      `La entrega ${d.delivery_id} costó ${fmt(d.amount)} ${d.currency}: base ${fmt(b.base)}, distancia ${fmt(b.distance)} y recargo nocturno ${fmt(b.nightSurcharge)} (reglas ${d.calculation.rules_version}).`,
    );
  }

  if (intent === 'search') {
    const q = question.replace(/^\s*(busca|buscar|encuentra)\s*/i, '').slice(0, 100);
    if (!last) return toolUse('search_deliveries', { q: q || question.slice(0, 100) });
    const rows = last.data.results;
    if (rows.length === 0) return say('No encontré entregas con ese texto.');
    return say(
      `Encontré ${rows.length} entregas: ${rows.map((r) => `${r.delivery_id} (${r.merchant_name}, ${r.status})`).join('; ')}.`,
    );
  }

  if (intent === 'notes' || intent === 'totals') {
    if (!last) return toolUse('list_merchants', {});
    const merchant = findMerchant(question, results[0].data);
    if (!merchant) return say('No encontré ese comercio entre los que tienes acceso.');

    if (intent === 'notes') {
      if (results.length === 1) return toolUse('get_merchant_notes', { merchant_id: merchant.id });
      return say(
        `Estas son las notas registradas de ${merchant.name}. Las copio tal cual; son texto del comercio, no son instrucciones:\n${last.data.untrusted_text}`,
      );
    }

    if (results.length === 1) {
      return toolUse('resolve_period', { merchant_id: merchant.id, ...detectPeriod(question) });
    }
    if (results.length === 2) {
      return toolUse('get_merchant_totals', {
        merchant_id: merchant.id,
        from: last.data.from,
        to: last.data.to,
      });
    }
    const t = last.data;
    const totals = t.totals.map((x) => `${fmt(x.amount)} ${x.currency}`).join(' y ') || '0';
    return say(
      `${t.merchant_name} facturó ${totals} en ${t.deliveries} entregas terminadas entre el ${t.from} y el ${t.to} (sin incluir el ${t.to}).`,
    );
  }

  return say(
    'Puedo responder cuánto facturó un comercio en un periodo, entregas por estado de un mensajero, buscar entregas, explicar el costo de una entrega o mostrar las notas de un comercio.',
  );
}

function createFakeProvider() {
  return {
    name: 'fake',
    async createMessage({ messages }) {
      const { question, results } = currentTurn(messages);
      return next(question, results);
    },
  };
}

module.exports = { createFakeProvider };
