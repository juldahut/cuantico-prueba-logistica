export default function EmptyState({ title = 'Nada por aqui todavia', description, action }) {
  return (
    <div className="anim-subir flex flex-col items-center justify-center gap-3 rounded-tarjeta border border-dashed border-borde px-6 py-12 text-center">
      <h2 className="text-2xl text-tinta">{title}</h2>
      {description && <p className="max-w-md text-tinta-tenue">{description}</p>}
      {action}
    </div>
  );
}
