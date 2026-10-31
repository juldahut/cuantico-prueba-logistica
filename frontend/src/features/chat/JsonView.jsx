import { stripMarkers } from '../../lib/summary.js';

// JSON con claves y valores resaltados. Se pinta con elementos React (nunca
// HTML en bruto) y sin los delimitadores de texto de terceros.
function Value({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-lavanda-tenue">null</span>;
  }
  if (typeof value === 'string') {
    return <span className="text-lima">&quot;{stripMarkers(value)}&quot;</span>;
  }
  if (typeof value === 'number') return <span className="text-aviso">{value}</span>;
  if (typeof value === 'boolean') return <span className="text-marca-cian">{String(value)}</span>;
  return <Node value={value} />;
}

function Node({ value }) {
  const isArray = Array.isArray(value);
  const entries = isArray ? value.map((v, i) => [i, v]) : Object.entries(value);
  const [open, close] = isArray ? ['[', ']'] : ['{', '}'];
  if (entries.length === 0) {
    return (
      <span>
        {open}
        {close}
      </span>
    );
  }
  return (
    <span>
      {open}
      {entries.map(([key, v], i) => (
        <span key={key} className="block pl-4">
          {!isArray && <span className="text-lila">&quot;{String(key)}&quot;</span>}
          {!isArray && ': '}
          <Value value={v} />
          {i < entries.length - 1 ? ',' : ''}
        </span>
      ))}
      {close}
    </span>
  );
}

export default function JsonView({ value }) {
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-noche p-3 font-mono text-xs leading-relaxed text-lavanda">
      <Value value={value} />
    </pre>
  );
}
