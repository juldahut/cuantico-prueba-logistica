// Resumen legible de los datos de las tools (sin JSON crudo), para cuando las
// cifras del modelo no se pudieron verificar.
export default function Summary({ blocks }) {
  if (blocks.length === 0) return null;
  return (
    <div className="mt-3 flex flex-col gap-3">
      {blocks.map((block, i) => (
        <section key={i} className="rounded-2xl border border-lila/15 bg-noche p-4">
          <h3 className="text-base text-lila-claro">{block.title}</h3>
          {block.subtitle && <p className="text-sm text-lavanda">{block.subtitle}</p>}
          <dl className="mt-2 divide-y divide-lila/10">
            {block.rows.map((row, j) => (
              <div key={j} className="flex flex-wrap items-baseline justify-between gap-x-4 py-1.5">
                <dt className="text-sm text-lavanda">{row.label}</dt>
                <dd className="font-mono text-sm text-lila-claro">
                  {row.value}
                  {row.hint && <span className="ml-2 text-lavanda-tenue">{row.hint}</span>}
                </dd>
              </div>
            ))}
          </dl>
          {block.note && <p className="mt-2 text-xs text-lavanda-tenue">{block.note}</p>}
          {block.rows.length === 0 && <p className="py-1.5 text-sm text-lavanda">Sin datos.</p>}
        </section>
      ))}
    </div>
  );
}
