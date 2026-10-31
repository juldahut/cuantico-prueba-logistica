import { useState } from 'react';
import { apiPost } from '../../lib/api.js';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Label from '../../components/ui/Label.jsx';
import Wordmark from '../../components/Wordmark.jsx';
import NodesArt from './NodesArt.jsx';

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <section className="relative isolate flex flex-col justify-between gap-10 overflow-hidden bg-morado px-6 py-8 sm:px-12 lg:py-12">
        <div className="orbe orbe-violeta -left-24 -top-24 -z-10 h-96 w-96" aria-hidden="true" />
        <div className="orbe orbe-magenta -bottom-32 right-0 -z-10 h-96 w-96" aria-hidden="true" />
        <div className="orbe orbe-cian right-1/4 top-1/3 -z-10 h-64 w-64" aria-hidden="true" />
        <Wordmark />
        <div className="anim-subir">
          <h1 className="text-[clamp(2.5rem,6vw,4.75rem)] text-lila-claro">
            Operaciones, <span className="texto-degradado">en lenguaje natural.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-lavanda">
            Pregunta por entregas, costos y comercios. Las cifras las calculan consultas del
            sistema, no el modelo.
          </p>
        </div>
        <NodesArt className="anim-aparecer hidden max-h-64 w-full max-w-md lg:block" />
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <Card title="Asistente de operaciones" className="anim-subir w-full max-w-md">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
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
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p role="alert" className="text-sm font-semibold text-error">
                {error}
              </p>
            )}
            <Button
              type="submit"
              variant="accent"
              loading={loading}
              disabled={!email || !password}
              className="mt-2"
            >
              Entrar
            </Button>
          </form>
        </Card>
      </section>
    </main>
  );
}
