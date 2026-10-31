// Wordmark de texto (sin logos ni imagenes del sitio de Cuantico).
export default function Wordmark({ className = '' }) {
  return (
    <span
      className={`font-titulo text-xl font-extrabold uppercase tracking-[0.18em] text-lila-claro ${className}`}
    >
      Cuantico
    </span>
  );
}
