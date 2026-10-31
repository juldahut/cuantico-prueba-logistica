// Resumen legible de los datos de las tools: tarjetas con filas etiqueta y
// valor, sin JSON ni nombres internos.
export default function Summary({ blocks }) {
  if (blocks.length === 0) return null;
  return (
    <div className="mt-3 flex flex-col gap-3">
      {blocks.map((block, i) => (
        <section key={i} className="rounded-2xl border border-borde bg-white p-4">
          <h3 className="text-base text-tinta">{block.title}</h3>
          {block.subtitle && <p className="text-sm text-tinta-tenue">{block.subtitle}</p>}
          <dl className="mt-2 divide-y divide-borde">
            {block.rows.map((row, j) => (
              <div key={j} className="flex flex-wrap items-baseline justify-between gap-x-4 py-1.5">
                <dt className="text-sm text-tinta-tenue">{row.label}</dt>
                <dd className="break-words text-right text-sm font-semibold text-tinta">
                  {row.value}
                  {row.hint && (
                    <span className="ml-2 font-normal text-tinta-tenue">{row.hint}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {block.note && <p className="mt-2 text-xs text-tinta-tenue">{block.note}</p>}
          {block.rows.length === 0 && <p className="py-1.5 text-sm text-tinta-tenue">Sin datos.</p>}
        </section>
      ))}
    </div>
  );
}
