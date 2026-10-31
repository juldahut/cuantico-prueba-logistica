const VARIANTS = {
  primary: 'bg-violeta text-white hover:bg-violeta-profundo',
  accent: 'bg-violeta text-white hover:bg-violeta-profundo',
  secondary: 'border border-violeta/40 bg-white text-violeta hover:bg-lila-claro',
  ghost: 'bg-transparent text-tinta-suave hover:bg-lila-claro',
  // Sobre la cabecera oscura.
  onDark: 'border border-white/40 bg-transparent text-white hover:bg-white/10',
  destructive: 'bg-error text-white hover:brightness-95',
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
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-2 font-titulo text-sm font-bold transition-colors duration-150 ease-estandar disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant] ?? VARIANTS.primary} ${className}`}
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
