import { formatQuantity } from '../../utils/pricing';
import { pluralizeUnit } from '../../utils/units';
import { stockLevel } from '../../utils/stock';

const STYLES = {
  in: { dot: 'bg-success', text: 'text-success' },
  low: { dot: 'bg-warning', text: 'text-warning' },
  out: { dot: 'bg-danger', text: 'text-danger' },
};

function StockIndicator({ product, showQuantity = true, className = '' }) {
  const level = stockLevel(product);
  const style = STYLES[level];
  const qty = `${formatQuantity(product.stock)} ${pluralizeUnit(product.unit, product.stock)}`;
  const label = level === 'out' ? 'Out of stock' : showQuantity ? `${qty} in stock` : level === 'low' ? 'Low stock' : 'In stock';

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${style.text} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {label}
      {level === 'low' && showQuantity && <span className="sr-only">(low)</span>}
    </span>
  );
}

export default StockIndicator;
