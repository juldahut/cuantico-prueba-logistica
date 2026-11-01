import Badge from '../../components/ui/Badge.jsx';

// Notas del comercio: texto de terceros, mostrado como cita y como dato.
export default function NoteQuote({ merchantName, notes, instructions }) {
  return (
    <figure className="mt-3 rounded-2xl border border-aviso/30 bg-aviso-fondo p-4">
      <figcaption className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-tinta">Notas de {merchantName}</span>
        <Badge tone="warning">Texto de terceros, tratado como dato</Badge>
      </figcaption>
      <blockquote className="flex flex-col gap-2 border-l-2 border-aviso/50 pl-4 text-tinta-suave">
        {notes && (
          <p className="whitespace-pre-wrap break-words">
            <span className="font-semibold text-tinta">Notas: </span>
            {notes}
          </p>
        )}
        {instructions && (
          <p className="whitespace-pre-wrap break-words">
            <span className="font-semibold text-tinta">Instrucciones de entrega: </span>
            {instructions}
          </p>
        )}
        {!notes && !instructions && <p>Sin notas registradas.</p>}
      </blockquote>
    </figure>
  );
}
