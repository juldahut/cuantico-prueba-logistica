export default function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-border ${className}`}>
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead className="bg-surface-muted text-xs uppercase tracking-wide text-ink-muted">
      {children}
    </thead>
  );
}

export function Th({ children, className = '' }) {
  return (
    <th scope="col" className={`px-4 py-3 font-medium ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 align-top text-ink ${className}`}>{children}</td>;
}

export function Tr({ children, className = '' }) {
  return (
    <tr
      className={`border-t border-border first:border-t-0 hover:bg-surface-muted/60 ${className}`}
    >
      {children}
    </tr>
  );
}
