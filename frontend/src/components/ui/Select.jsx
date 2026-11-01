export default function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full rounded-full border border-borde bg-white px-5 py-2.5 text-base text-tinta focus:border-violeta disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
