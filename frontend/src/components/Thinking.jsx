export default function Thinking() {
  return (
    <div
      role="status"
      aria-label="El asistente está respondiendo"
      className="anim-aparecer flex items-center gap-3 rounded-full border border-lila/15 bg-noche-elevada px-5 py-3"
    >
      <span className="flex gap-1.5" aria-hidden="true">
        <span className="punto-pensando" />
        <span className="punto-pensando" />
        <span className="punto-pensando" />
      </span>
      <span className="text-sm text-lavanda">Consultando datos…</span>
    </div>
  );
}
