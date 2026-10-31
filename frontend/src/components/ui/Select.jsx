export default function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full rounded-full border border-lila/25 bg-noche px-5 py-2.5 text-base text-lila-claro disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
