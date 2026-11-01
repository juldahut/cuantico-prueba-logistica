export default function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-tarjeta border border-borde ${className}`}>
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead className="bg-lila-claro text-xs uppercase tracking-wide text-tinta-tenue">
      {children}
    </thead>
  );
}

export function Th({ children, className = '' }) {
  return (
    <th scope="col" className={`px-4 py-3 font-bold ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 align-top text-tinta ${className}`}>{children}</td>;
}

export function Tr({ children, className = '' }) {
  return (
    <tr className={`border-t border-borde first:border-t-0 hover:bg-lila-claro ${className}`}>
      {children}
    </tr>
  );
}
