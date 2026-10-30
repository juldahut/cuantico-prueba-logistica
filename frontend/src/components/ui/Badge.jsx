const TONES = {
  neutral: 'bg-neutral-bg text-neutral',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info',
  success: 'bg-success-bg text-success',
};

export default function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone] || TONES.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
