// Wordmark de texto (sin logos ni imagenes del sitio de Cuantico). Pensado para
// fondos oscuros: la cabecera y el login.
export default function Wordmark({ className = '' }) {
  return (
    <span
      className={`font-titulo text-xl font-extrabold uppercase tracking-[0.18em] text-white ${className}`}
    >
      Cuantico
    </span>
  );
}
