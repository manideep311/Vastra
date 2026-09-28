// One mapping for every order/quote status so the same state always looks
// the same across buyer and supplier screens.
const STYLES = {
  pending: 'bg-warning-soft text-warning',
  accepted: 'bg-info-soft text-info',
  preparing: 'bg-info-soft text-info',
  ready_for_dispatch: 'bg-brand-soft text-brand',
  completed: 'bg-success-soft text-success',
  quoted: 'bg-info-soft text-info',
  rejected: 'bg-danger-soft text-danger',
  expired: 'bg-surface-2 text-muted',
};

const LABELS = {
  ready_for_dispatch: 'Ready to dispatch',
  quoted: 'Offer received',
};

const statusLabel = (status) => {
  if (LABELS[status]) return LABELS[status];
  const text = String(status || '').replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

function StatusBadge({ status, label }) {
  return (
    <span className={`badge ${STYLES[status] || 'bg-surface-2 text-ink-2'}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {label || statusLabel(status)}
    </span>
  );
}

export default StatusBadge;
