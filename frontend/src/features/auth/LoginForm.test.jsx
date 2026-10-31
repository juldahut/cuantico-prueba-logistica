import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LoginForm from './LoginForm.jsx';

afterEach(() => vi.unstubAllEnvs());

describe('LoginForm', () => {
  it('en un build de demostración indica los usuarios y dónde están las claves, sin mostrar ninguna', () => {
    vi.stubEnv('VITE_DEMO_HINT', 'true');
    render(<LoginForm onLogin={vi.fn()} />);
    const hint = screen.getByText(/Usuarios de demostración/);
    expect(hint).toHaveTextContent('ops.la80@cuantico.test');
    expect(hint).toHaveTextContent('ops.farmacia@cuantico.test');
    expect(hint).toHaveTextContent('admin@cuantico.test');
    expect(hint).toHaveTextContent('.env');
    // Ninguna clave: solo se nombran las variables DEMO_*_PASSWORD.
    expect(hint.textContent).not.toMatch(/(clave|password|contraseña)\s*[:=]\s*\S/i);
  });

  it('sin VITE_DEMO_HINT (build real) no anuncia cuentas de demostración', () => {
    vi.stubEnv('VITE_DEMO_HINT', '');
    render(<LoginForm onLogin={vi.fn()} />);
    expect(screen.queryByText(/Usuarios de demostración/)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/admin@cuantico\.test/);
  });
});
