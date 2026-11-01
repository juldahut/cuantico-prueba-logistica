export default function ErrorState({ message = 'Ocurrio un error inesperado.', onRetry }) {
  return (
    <div
      role="alert"
      className="anim-subir flex flex-col items-start gap-3 rounded-tarjeta border border-error/30 bg-error-fondo px-5 py-4"
    >
      <p className="font-semibold text-error">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded-full border border-error px-5 py-1.5 font-titulo text-sm font-bold text-error transition-colors duration-150 hover:bg-error hover:text-white"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
