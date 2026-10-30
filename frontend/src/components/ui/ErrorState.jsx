export default function ErrorState({ message = 'Ocurrio un error inesperado.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-danger-bg bg-danger-bg px-6 py-12 text-center">
      <p className="text-sm font-medium text-danger">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-danger px-3 py-1.5 text-sm font-medium text-danger transition-colors duration-150 hover:bg-danger hover:text-white"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
