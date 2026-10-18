export default function LoadingSpinner({ size = 24, label = 'Loading' }) {
  return (
    <div className="loading-spinner" role="status" aria-live="polite" aria-label={label}>
      <span className="spinner" style={{ width: size, height: size }} />
    </div>
  );
}
