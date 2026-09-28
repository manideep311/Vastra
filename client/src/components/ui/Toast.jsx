import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/20/solid';

const ToastContext = createContext(null);

const TONES = {
  success: { icon: CheckCircleIcon, iconClass: 'text-emerald-300' },
  error: { icon: ExclamationCircleIcon, iconClass: 'text-red-300' },
  info: { icon: InformationCircleIcon, iconClass: 'text-sky-300' },
};

/**
 * One app-wide toast region (aria-live) instead of a hand-rolled fixed <div>
 * per page. `toast.success('Added to cart', { action: { label: 'View cart', to: '/cart' } })`.
 */
export function ToastProvider({ children }) {
  const [current, setCurrent] = useState(null);
  const timer = useRef(null);

  const dismiss = useCallback(() => {
    clearTimeout(timer.current);
    setCurrent(null);
  }, []);

  const show = useCallback((tone, message, { action, duration = 3200 } = {}) => {
    clearTimeout(timer.current);
    setCurrent({ id: Date.now(), tone, message, action });
    timer.current = setTimeout(() => setCurrent(null), duration);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const api = useMemo(
    () => ({
      success: (message, opts) => show('success', message, opts),
      error: (message, opts) => show('error', message, { duration: 4500, ...opts }),
      info: (message, opts) => show('info', message, opts),
      dismiss,
    }),
    [show, dismiss]
  );

  const tone = current ? TONES[current.tone] : null;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-4 md:bottom-6"
      >
        {current && (
          <div
            key={current.id}
            className="pointer-events-auto flex max-w-md animate-fade-up items-center gap-3 rounded-2xl bg-ink py-2.5 pl-3.5 pr-2 text-sm text-white shadow-[0_12px_32px_-12px_rgba(12,58,43,0.55)]"
          >
            <tone.icon className={`h-5 w-5 flex-shrink-0 ${tone.iconClass}`} aria-hidden="true" />
            <span className="min-w-0 flex-1 leading-snug">{current.message}</span>
            {current.action && (
              <Link
                to={current.action.to}
                onClick={dismiss}
                className="rounded-full px-2.5 py-1 text-sm font-semibold text-amber-200 transition-colors hover:bg-white/10"
              >
                {current.action.label}
              </Link>
            )}
            <button type="button" onClick={dismiss} className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label="Dismiss notification">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
