import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Wordmark from '../../components/Wordmark.jsx';

const ROLES = { admin: 'Administrador', operaciones: 'Operaciones' };

// Lateral: quien eres, a que comercios llegas y preguntas sugeridas. En movil
// se pliega con un boton.
export default function Sidebar({ user, open, onToggle, suggestions, onPick, onLogout, disabled }) {
  const merchants = user.merchants ?? [];

  return (
    <aside className="border-b border-lila/15 bg-morado lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:shrink-0 lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div>
          <Wordmark />
          <p className="text-xs text-lavanda">Asistente de operaciones</p>
        </div>
        <Button
          variant="secondary"
          className="px-4 lg:hidden"
          aria-expanded={open}
          aria-controls="panel-lateral"
          onClick={onToggle}
        >
          {open ? 'Ocultar' : 'Menú'}
        </Button>
      </div>

      <div
        id="panel-lateral"
        className={`${open ? 'flex' : 'hidden'} flex-col gap-6 px-5 pb-6 lg:flex`}
      >
        <section aria-label="Tu sesión" className="flex flex-col gap-2">
          <p className="break-all text-sm text-lila-claro">{user.email}</p>
          <div>
            <Badge tone="info">{ROLES[user.role] ?? user.role}</Badge>
          </div>
          <ul className="mt-1 flex flex-col gap-1.5">
            {merchants.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-lila/15 bg-noche-elevada px-3 py-2"
              >
                <p className="text-sm font-semibold text-lila-claro">{m.name}</p>
                {m.timeZone && <p className="font-mono text-xs text-lavanda">{m.timeZone}</p>}
              </li>
            ))}
            {merchants.length === 0 && (
              <li className="text-sm text-lavanda">Sin comercios asignados.</li>
            )}
          </ul>
        </section>

        <section aria-label="Preguntas sugeridas" className="flex flex-col gap-2">
          <h2 className="text-sm uppercase tracking-wide text-lavanda">Preguntas sugeridas</h2>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.label}
                type="button"
                disabled={disabled}
                onClick={() => onPick(s.question)}
                className="cursor-pointer rounded-full border border-lila/30 px-4 py-1.5 text-left text-sm text-lila-claro transition-colors duration-150 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <Button variant="secondary" onClick={onLogout} className="self-start">
          Salir
        </Button>
      </div>
    </aside>
  );
}
