export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-full border border-lila/25 bg-noche px-5 py-2.5 text-base text-lila-claro placeholder:text-lavanda-tenue disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}
