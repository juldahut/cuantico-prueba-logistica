import { useState } from 'react';
import { apiPost } from '../../lib/api.js';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Label from '../../components/ui/Label.jsx';
import Wordmark from '../../components/Wordmark.jsx';
import NodesArt from './NodesArt.jsx';

// La pista de usuarios de demo solo va en builds de demostracion (VITE_DEMO_HINT)
// o en desarrollo: un despliegue real no debe anunciar cuentas.
const showDemoHint = () =>
  import.meta.env.VITE_DEMO_HINT === 'true' || import.meta.env.MODE === 'development';

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await apiPost('/auth/login', { email, password });
      onLogin({ token, user });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen overflow-x-clip lg:grid-cols-2">
      <section className="sobre-oscuro relative isolate flex min-h-[26rem] flex-col justify-between gap-10 overflow-hidden bg-morado px-6 py-8 text-white sm:px-12 lg:min-h-screen lg:py-12">
        <div className="orbe orbe-violeta -left-24 -top-24 -z-10 h-96 w-96" aria-hidden="true" />
        <div
          className="orbe orbe-magenta -bottom-32 -right-16 -z-10 h-[28rem] w-[28rem]"
          aria-hidden="true"
        />
        <div
          className="orbe orbe-cian right-1/4 top-1/2 -z-10 h-64 w-64 opacity-30"
          aria-hidden="true"
        />
        <NodesArt className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-60" />
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <span className="punto-luz left-[12%] top-[18%]" />
          <span className="punto-luz left-[78%] top-[12%]" />
          <span className="punto-luz left-[40%] top-[34%]" />
          <span className="punto-luz left-[88%] top-[46%]" />
          <span className="punto-luz left-[22%] top-[62%]" />
          <span className="punto-luz left-[64%] top-[72%]" />
          <span className="punto-luz left-[8%] top-[86%]" />
          <span className="punto-luz left-[52%] top-[90%]" />
        </div>
        <Wordmark className="anim-aparecer" />
        <div>
          <h1 className="text-[clamp(2.25rem,5vw,4rem)]">
            <span className="anim-subir retardo-1 block">Pregunta por tus entregas,</span>
            <span className="anim-subir retardo-3 block">
              <span className="texto-degradado-vivo">en tus palabras.</span>
            </span>
          </h1>
          <p className="anim-subir retardo-4 mt-5 max-w-md text-lg text-lavanda">
            Cuánto facturó un comercio, cómo va un mensajero, qué entregas hay en una calle. El
            asistente consulta el sistema y te lo explica.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Qué puedes consultar">
            {['Facturación', 'Mensajeros', 'Entregas y notas'].map((topic, i) => (
              <li key={topic} className={`anim-subir ${i === 0 ? 'retardo-5' : 'retardo-6'}`}>
                <span className="chip-flota block rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-sm font-semibold backdrop-blur-sm">
                  {topic}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <span aria-hidden="true" />
      </section>

      <section className="flex items-center justify-center bg-white px-4 py-10 sm:px-8">
        <div className="anim-subir w-full max-w-sm">
          <h2 className="text-3xl text-tinta">Entrar</h2>
          <p className="mt-1 text-tinta-tenue">Usa el correo y la clave que te dieron.</p>
          {showDemoHint() && (
            <p className="mt-2 text-sm text-tinta-tenue">
              Usuarios de demostración: ops.la80@cuantico.test, ops.farmacia@cuantico.test y
              admin@cuantico.test. Las claves están en el archivo .env del proyecto
              (DEMO_*_PASSWORD).
            </p>
          )}
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <div>
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Clave</Label>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label className="mt-2 flex w-fit cursor-pointer items-center gap-2 text-sm text-tinta-tenue">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="h-4 w-4 accent-violeta"
                />
                Mostrar clave
              </label>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-2xl bg-error-fondo px-4 py-2 text-sm font-semibold text-error"
              >
                {error}
              </p>
            )}
            <Button type="submit" loading={loading} disabled={!email || !password} className="mt-2">
              Entrar
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
