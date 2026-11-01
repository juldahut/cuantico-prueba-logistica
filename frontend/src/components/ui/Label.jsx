export default function Label({ htmlFor, children, className = '' }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`mb-1.5 block text-sm font-semibold text-tinta-suave ${className}`}
    >
      {children}
    </label>
  );
}
