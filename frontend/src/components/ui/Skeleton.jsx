export default function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse rounded-md bg-surface-muted ${className}`} aria-hidden="true" />
  );
}
