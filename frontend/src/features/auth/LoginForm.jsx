import { useState } from 'react';
import { apiPost } from '../../lib/api.js';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Label from '../../components/ui/Label.jsx';
import Wordmark from '../../components/Wordmark.jsx';
import NodesArt from './NodesArt.jsx';

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
      <section className="sobre-oscuro relative isolate flex flex-col justify-between gap-10 overflow-hidden bg-morado px-6 py-8 text-white sm:px-12 lg:py-12">
        <div className="orbe orbe-violeta -left-24 -top-24 -z-10 h-96 w-96" aria-hidden="true" />
        <Wordmark />
        <div className="anim-subir">
          <h1 className="text-[clamp(2.25rem,5vw,4rem)]">
            Pregunta por tus entregas, <span className="texto-degradado">en tus palabras.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-lavanda">
            Cuánto facturó un comercio, cómo va un mensajero, qué entregas hay en una calle. El
            asistente consulta el sistema y te lo explica.
          </p>
        </div>
        <NodesArt className="hidden max-h-56 w-full max-w-sm opacity-80 lg:block" />
      </section>

      <section className="flex items-center justify-center bg-white px-4 py-10 sm:px-8">
        <div className="anim-subir w-full max-w-sm">
          <h2 className="text-3xl text-tinta">Entrar</h2>
          <p className="mt-1 text-tinta-tenue">Usa el correo y la clave que te dieron.</p>
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
