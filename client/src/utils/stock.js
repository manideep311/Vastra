// Stock as a sourcing signal: can this supplier actually fill a bulk order?
// "Low" means less than ~3x the minimum order (or 20 units) is left.
export const stockLevel = (product) => {
  if (product.status !== 'available' || product.stock <= 0) return 'out';
  const moq = product.moq > 1 ? product.moq : 1;
  return product.stock < Math.max(moq * 3, 20) ? 'low' : 'in';
};
