export default function Thinking() {
  return (
    <div
      role="status"
      aria-label="El asistente está respondiendo"
      className="anim-aparecer flex w-fit items-center gap-3 rounded-full border border-borde bg-lila-claro px-5 py-3"
    >
      <span className="flex gap-1.5" aria-hidden="true">
        <span className="punto-pensando" />
        <span className="punto-pensando" />
        <span className="punto-pensando" />
      </span>
      <span className="text-sm text-tinta-suave">Consultando los datos…</span>
    </div>
  );
}
