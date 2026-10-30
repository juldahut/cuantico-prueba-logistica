export default function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
