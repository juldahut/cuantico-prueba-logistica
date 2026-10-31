export default function Card({ title, actions, className = '', children }) {
  return (
    <div className={`rounded-tarjeta border border-borde bg-white p-6 shadow-tarjeta ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-2xl text-tinta">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
