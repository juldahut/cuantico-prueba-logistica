import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RichText, { parseBlocks } from './RichText.jsx';

describe('RichText', () => {
  it('muestra negritas y listas sin asteriscos ni guiones sueltos', () => {
    const { container } = render(
      <RichText
        text={'El mensajero **Ana Rojas** tiene:\n\n- **Entregada:** 2\n- **En ruta:** 1'}
      />,
    );
    expect(container.textContent).not.toMatch(/\*\*/);
    expect(screen.getByText('Ana Rojas').tagName).toBe('STRONG');
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Entregada: 2');
    expect(items[1]).toHaveTextContent('En ruta: 1');
  });

  it('listas numeradas, encabezados y codigo en linea', () => {
    const { container } = render(
      <RichText text={'## Costo\n1. Base: 5.000\n2. Distancia: 2.400\nUsa `distance_km`.'} />,
    );
    expect(container.textContent).not.toMatch(/##|`/);
    expect(screen.getByText('Costo')).toBeInTheDocument();
    expect(container.querySelector('ol')).not.toBeNull();
    expect(screen.getByText('distance_km').tagName).toBe('CODE');
  });

  it('el HTML se queda como texto: nunca se interpreta', () => {
    const { container } = render(
      <RichText text={'<img src=x onerror=alert(1)> y <script>alert(1)</script> **ok**'} />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(screen.getByText('ok').tagName).toBe('STRONG');
  });

  it('un formato que no cierra se deja como texto, sin romper', () => {
    const { container } = render(<RichText text={'Total **sin cerrar y `codigo abierto'} />);
    expect(container.textContent).toBe('Total **sin cerrar y `codigo abierto');
  });

  it('separa parrafos y respeta los saltos de linea simples', () => {
    expect(parseBlocks('uno\ndos\n\ntres')).toEqual([
      { type: 'p', lines: ['uno', 'dos'] },
      { type: 'p', lines: ['tres'] },
    ]);
    expect(parseBlocks('- a\n* b\n• c')).toEqual([{ type: 'ul', lines: ['a', 'b', 'c'] }]);
    expect(parseBlocks('')).toEqual([]);
  });
});
