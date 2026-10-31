export default function ErrorState({ message = 'Ocurrio un error inesperado.', onRetry }) {
  return (
    <div
      role="alert"
      className="anim-subir flex flex-col items-center justify-center gap-3 rounded-tarjeta border border-error/40 bg-error-fondo px-6 py-8 text-center"
    >
      <p className="font-semibold text-error">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="cursor-pointer rounded-full border border-error px-5 py-1.5 font-titulo text-sm font-bold text-error transition-colors duration-150 hover:bg-error hover:text-noche"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
