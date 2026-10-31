export default function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-tarjeta border border-lila/15 ${className}`}>
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead className="bg-morado text-xs uppercase tracking-wide text-lavanda">{children}</thead>
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
  return <td className={`px-4 py-3 align-top text-lila-claro ${className}`}>{children}</td>;
}

export function Tr({ children, className = '' }) {
  return (
    <tr className={`border-t border-lila/10 first:border-t-0 hover:bg-white/5 ${className}`}>
      {children}
    </tr>
  );
}
