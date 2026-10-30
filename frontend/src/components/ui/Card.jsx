export default function Card({ title, actions, className = '', children }) {
  return (
    <div className={`rounded-lg border border-border bg-surface p-5 shadow-sm ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
