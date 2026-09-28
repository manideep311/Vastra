import { CheckIcon } from '@heroicons/react/20/solid';
import { ORDER_FLOW } from '../utils/orderStatus';

const STEP_LABELS = {
  pending: 'Placed',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready_for_dispatch: 'Ready',
  completed: 'Completed',
};

/**
 * Five-step order tracker. Shows the date each step was reached (from
 * statusHistory) so buyers and suppliers see the same timeline.
 */
function OrderProgress({ order }) {
  const current = ORDER_FLOW.indexOf(order.status);
  const reachedAt = Object.fromEntries((order.statusHistory || []).map((h) => [h.status, h.timestamp]));

  return (
    <ol className="grid grid-cols-5" aria-label={`Order progress: ${STEP_LABELS[order.status]}`}>
      {ORDER_FLOW.map((step, i) => {
        const done = i <= current;
        const isCurrent = i === current;
        return (
          <li key={step} className="relative flex flex-col items-center text-center" aria-current={isCurrent ? 'step' : undefined}>
            {i > 0 && (
              <span className={`absolute right-1/2 top-2.5 h-0.5 w-full -translate-y-1/2 ${i <= current ? 'bg-brand' : 'bg-line'}`} aria-hidden="true" />
            )}
            <span
              className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                done ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface'
              } ${isCurrent ? 'ring-4 ring-brand/15' : ''}`}
            >
              {done && <CheckIcon className="h-3 w-3" aria-hidden="true" />}
            </span>
            <span className={`mt-1.5 text-[11px] font-medium leading-tight ${done ? 'text-ink' : 'text-muted'}`}>{STEP_LABELS[step]}</span>
            {reachedAt[step] && (
              <span className="hidden text-[10px] text-muted sm:block">
                {new Date(reachedAt[step]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default OrderProgress;
