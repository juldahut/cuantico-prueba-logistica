const TONES = {
  neutral: 'bg-white/10 text-lavanda',
  danger: 'bg-error-fondo text-error',
  info: 'bg-violeta/30 text-lila-palido',
  success: 'bg-lima text-lima-oscuro',
  warning: 'bg-aviso/15 text-aviso',
};

export default function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${TONES[tone] ?? TONES.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
