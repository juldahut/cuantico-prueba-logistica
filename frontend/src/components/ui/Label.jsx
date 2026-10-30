export default function Label({ htmlFor, children, className = '' }) {
  return (
    <label htmlFor={htmlFor} className={`mb-1.5 block text-sm font-medium text-ink ${className}`}>
      {children}
    </label>
  );
}
