// Central source of truth for product selling units — used by the supplier
// product form (dropdown) and the buyer product detail page (quantity input
// validation + live price display). Keeping this in one place means both
// sides of the marketplace always agree on what units exist and how they
// behave.

export const UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'meter', label: 'Meter (meter)' },
  { value: 'unit', label: 'Unit (unit)' },
];

// Units that are commonly sold in fractional amounts (e.g. 2.5 kg of fabric,
// 3.75 meters off a roll). Anything not in this set is treated as a
// discrete, whole-number-only unit.
const DECIMAL_UNITS = new Set(['kg', 'meter']);

export const unitAllowsDecimals = (unit) => DECIMAL_UNITS.has(unit);

export const getUnitLabel = (unit) => UNIT_OPTIONS.find((u) => u.value === unit)?.label || unit || 'unit';

// Formats a price + unit pair consistently everywhere it's shown, e.g. "₹120/kg".
export const formatPricePerUnit = (price, unit) => `₹${price}/${unit || 'unit'}`;

// Pluralizes a unit for quantity-aware copy, e.g. "1 meter" / "3 meters",
// "1 unit" / "5 units". "kg" is already its own plural.
export const pluralizeUnit = (unit, quantity) => {
  const base = unit || 'unit';
  if (base === 'kg') return base;
  return quantity === 1 ? base : `${base}s`;
};
