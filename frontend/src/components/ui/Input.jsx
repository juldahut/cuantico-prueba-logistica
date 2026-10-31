export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-full border border-borde bg-white px-5 py-2.5 text-base text-tinta placeholder:text-tinta-tenue focus:border-violeta disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}
