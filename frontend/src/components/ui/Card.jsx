export default function Card({ title, actions, className = '', children }) {
  return (
    <div
      className={`rounded-tarjeta border border-lila/15 bg-noche-elevada p-6 shadow-tarjeta ${className}`}
    >
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-xl text-lila-claro">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
