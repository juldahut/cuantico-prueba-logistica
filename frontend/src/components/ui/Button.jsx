'use client';

const VARIANTS = {
  primary: 'bg-accent text-accent-ink hover:brightness-95 focus-visible:outline-accent',
  secondary: 'border border-border bg-surface text-ink hover:bg-surface-muted',
  ghost: 'bg-transparent text-ink hover:bg-surface-muted',
  destructive: 'bg-danger text-white hover:brightness-95',
};

export default function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  className = '',
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
