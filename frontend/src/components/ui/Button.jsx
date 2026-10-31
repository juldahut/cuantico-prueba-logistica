const VARIANTS = {
  primary: 'bg-white text-noche hover:bg-lila-palido',
  accent: 'bg-violeta text-white hover:bg-violeta-profundo',
  secondary: 'border border-white/35 bg-transparent text-lila-claro hover:bg-white/10',
  ghost: 'bg-transparent text-lila-claro hover:bg-white/10',
  destructive: 'bg-error text-noche hover:brightness-95',
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
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-7 py-2 font-titulo text-sm font-bold transition-colors duration-150 ease-estandar disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant] ?? VARIANTS.primary} ${className}`}
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
