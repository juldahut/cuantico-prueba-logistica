const TONES = {
  neutral: 'bg-lila-palido text-tinta-suave',
  danger: 'bg-error-fondo text-error',
  info: 'bg-lila-palido text-violeta-profundo',
  success: 'bg-exito-fondo text-exito',
  warning: 'bg-aviso-fondo text-aviso',
};

export default function Badge({ tone = 'neutral', className = '', children, ...props }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${TONES[tone] ?? TONES.neutral} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
