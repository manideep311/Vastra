import { MinusIcon, PlusIcon } from '@heroicons/react/20/solid';

// Keeps only characters valid for the unit: whole numbers, or up to two
// decimals for units commonly sold in fractions (kg, meter).
function sanitizeQuantityInput(value, allowDecimals) {
  let v = value.replace(/[^\d.]/g, '');
  if (!allowDecimals) return v.replace(/\./g, '');
  const [whole, ...rest] = v.split('.');
  v = rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
  return v;
}

const roundQty = (n) => Math.round(n * 100) / 100;

/**
 * − [ 120 ] meters +
 * Controlled with a string value so partially typed input ("12.") survives.
 * Steps by 1 and clamps to [min, max]; the parent owns validation messages.
 */
function QuantityStepper({
  id,
  value,
  onChange,
  onCommit,
  min = 1,
  max = Infinity,
  allowDecimals = false,
  unit,
  invalid = false,
  disabled = false,
  size = 'md',
  describedBy,
  label = 'Quantity',
}) {
  const numeric = Number(value);
  const hasNumber = value !== '' && Number.isFinite(numeric);

  const step = (delta) => {
    const base = hasNumber ? numeric : min;
    const next = roundQty(Math.min(max, Math.max(min, base + delta)));
    onChange(String(next));
    onCommit?.(next);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      step(-1);
    } else if (e.key === 'Enter' && onCommit && hasNumber) {
      onCommit(numeric);
    }
  };

  const sm = size === 'sm';
  const btn = `flex items-center justify-center text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30 ${
    sm ? 'h-8 w-8' : 'h-11 w-11'
  }`;

  return (
    <div
      className={`inline-flex items-center rounded-full border bg-surface transition-[border-color,box-shadow] duration-150 focus-within:ring-4 ${
        invalid ? 'border-danger focus-within:ring-danger/10' : 'border-line-strong focus-within:border-brand focus-within:ring-brand/10'
      }`}
    >
      <button type="button" className={`${btn} rounded-l-full`} onClick={() => step(-1)} disabled={disabled || (hasNumber && numeric <= min)} aria-label={`Decrease ${label.toLowerCase()}`}>
        <MinusIcon className="h-4 w-4" />
      </button>
      <input
        id={id}
        type="text"
        inputMode={allowDecimals ? 'decimal' : 'numeric'}
        value={value}
        disabled={disabled}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange(sanitizeQuantityInput(e.target.value, allowDecimals))}
        onBlur={() => onCommit && hasNumber && onCommit(numeric)}
        onKeyDown={onKeyDown}
        className={`min-w-0 bg-transparent text-center font-semibold tabular-nums text-ink outline-none ${sm ? 'w-12 text-sm' : 'w-16 text-base'}`}
      />
      {unit && <span className={`select-none pr-1 text-muted ${sm ? 'text-xs' : 'text-sm'}`}>{unit}</span>}
      <button type="button" className={`${btn} rounded-r-full`} onClick={() => step(1)} disabled={disabled || (hasNumber && numeric >= max)} aria-label={`Increase ${label.toLowerCase()}`}>
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export default QuantityStepper;
