// Formato basico de la respuesta del modelo (negritas, codigo en linea, listas
// y encabezados), sin asteriscos ni guiones sueltos. Es un lector propio y
// pequeno que solo produce elementos de React: el texto sigue siendo dato, nunca
// HTML (no hay dangerouslySetInnerHTML ni se interpreta ninguna etiqueta).

const BULLET = /^\s*(?:[-*•])\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;
const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;

// **negrita** y `codigo`; lo que no cierra bien se deja como texto.
function inline(text, key) {
  return text.split(INLINE).map((part, i) => {
    if (/^\*\*[^*\n]+\*\*$/.test(part)) {
      return <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (/^`[^`\n]+`$/.test(part)) {
      return (
        <code key={`${key}-${i}`} className="rounded bg-lila-palido px-1 font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// Agrupa las lineas en bloques: parrafos, listas y encabezados.
export function parseBlocks(text) {
  const blocks = [];
  let current = null;

  const flush = () => {
    if (current) blocks.push(current);
    current = null;
  };

  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (line.trim() === '') {
      flush();
      continue;
    }
    const heading = HEADING.exec(line);
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);

    if (heading) {
      flush();
      blocks.push({ type: 'heading', lines: [heading[1]] });
    } else if (bullet || numbered) {
      const type = bullet ? 'ul' : 'ol';
      if (!current || current.type !== type) {
        flush();
        current = { type, lines: [] };
      }
      current.lines.push((bullet || numbered)[1]);
    } else {
      if (!current || current.type !== 'p') {
        flush();
        current = { type: 'p', lines: [] };
      }
      current.lines.push(line.trim());
    }
  }
  flush();
  return blocks;
}

export default function RichText({ text }) {
  const blocks = parseBlocks(text);

  return (
    <div className="flex flex-col gap-2 break-words">
      {blocks.map((block, index) => {
        const key = `b${index}`;
        if (block.type === 'heading') {
          return (
            <p key={key} className="font-bold">
              {inline(block.lines[0], key)}
            </p>
          );
        }
        if (block.type === 'ul' || block.type === 'ol') {
          const List = block.type === 'ul' ? 'ul' : 'ol';
          return (
            <List
              key={key}
              className={`flex flex-col gap-1 pl-5 ${block.type === 'ul' ? 'list-disc' : 'list-decimal'}`}
            >
              {block.lines.map((line, i) => (
                <li key={`${key}-${i}`}>{inline(line, `${key}-${i}`)}</li>
              ))}
            </List>
          );
        }
        return (
          <p key={key}>
            {block.lines.map((line, i) => (
              <span key={`${key}-${i}`}>
                {i > 0 && <br />}
                {inline(line, `${key}-${i}`)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
