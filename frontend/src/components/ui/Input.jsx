export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}
