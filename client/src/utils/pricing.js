// A product's real minimum — unset/1 means no minimum at all. Mirrors the
// server rule in server/src/modules/cart/cart.service.js.
export const effectiveMoq = (product) => (product?.moq > 1 ? product.moq : 1);

// Highest bulk tier whose minQty is met, else the base price. Mirrors
// getEffectivePrice in server/src/modules/products/product.service.js — the
// server recomputes this at checkout, so this is display-only.
export const getEffectivePrice = (product, quantity) => {
  const tiers = product?.priceTiers || [];
  const applicable = tiers.filter((t) => quantity >= t.minQty).sort((a, b) => b.minQty - a.minQty);
  return applicable.length > 0 ? applicable[0].price : product.price;
};

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

// ₹1,23,456.50 — Indian digit grouping; drops ".00" on whole amounts.
export const formatINR = (amount) => {
  const n = Number(amount) || 0;
  return Number.isInteger(n) ? inrWhole.format(n) : inr.format(n);
};

const qty = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
export const formatQuantity = (n) => qty.format(Number(n) || 0);
