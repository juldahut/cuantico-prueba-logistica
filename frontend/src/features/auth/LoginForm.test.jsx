import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginForm from './LoginForm.jsx';

describe('LoginForm', () => {
  it('indica los usuarios de demostración y dónde están las claves, sin mostrar ninguna', () => {
    render(<LoginForm onLogin={vi.fn()} />);
    const hint = screen.getByText(/Usuarios de demostración/);
    expect(hint).toHaveTextContent('ops.la80@cuantico.test');
    expect(hint).toHaveTextContent('ops.farmacia@cuantico.test');
    expect(hint).toHaveTextContent('admin@cuantico.test');
    expect(hint).toHaveTextContent('.env');
  });
});
