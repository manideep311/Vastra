import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

// Explains why a list is empty and offers the obvious next step.
export function EmptyState({ icon: Icon, title, description, action, compact = false }) {
  return (
    <div className={`mx-auto flex max-w-sm animate-fade-up flex-col items-center text-center ${compact ? 'py-10' : 'py-16 md:py-20'}`}>
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-surface">
          <Icon className="h-5 w-5 text-muted" aria-hidden="true" />
        </div>
      )}
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      {description && <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>}
      {action && (
        <div className="mt-5">
          {action.to ? (
            <Link to={action.to} className="btn btn-primary">
              {action.label}
            </Link>
          ) : (
            <button type="button" onClick={action.onClick} className="btn btn-primary">
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Plain-language failure with a way to recover.
export function ErrorState({ title = "We couldn't load this", message, onRetry, compact = false }) {
  return (
    <div role="alert" className={`mx-auto flex max-w-sm animate-fade-up flex-col items-center text-center ${compact ? 'py-10' : 'py-16'}`}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft">
        <ExclamationTriangleIcon className="h-5 w-5 text-danger" aria-hidden="true" />
      </div>
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      {message && <p className="mt-1.5 text-sm text-muted">{message}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-secondary mt-5">
          Try again
        </button>
      )}
    </div>
  );
}

export function InlineError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
      <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Shown when a load runs long — most often the hosted API waking from sleep.
export function SlowServerNotice({ className = '' }) {
  return (
    <p role="status" className={`flex animate-fade-up items-center justify-center gap-2 text-center text-sm text-muted ${className}`}>
      <Spinner className="h-4 w-4 flex-shrink-0" />
      Still loading — the server is waking up after a quiet spell. The first load can take up to a minute.
    </p>
  );
}

// Route-level Suspense fallback — a thin bar, not a blank screen.
export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted" role="status" aria-label="Loading page">
      <Spinner className="h-5 w-5" />
    </div>
  );
}
