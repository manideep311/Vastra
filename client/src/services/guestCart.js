// Lightweight guest cart — lets a buyer add products to a cart before
// logging in. Stores only { productId, quantity } pairs in localStorage;
// cartService.js hydrates these into full product objects on read, and
// merges them into the buyer's real cart once they log in.

const GUEST_CART_KEY = 'guest_cart';

const readRaw = () => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeRaw = (items) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
};

export const getRawGuestCart = () => readRaw();

export const addGuestItem = (productId, quantity) => {
  const items = readRaw();
  const existing = items.find((item) => item.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({ productId, quantity });
  }
  writeRaw(items);
  return items;
};

export const setGuestItemQuantity = (productId, quantity) => {
  const items = readRaw().map((item) => (item.productId === productId ? { ...item, quantity } : item));
  writeRaw(items);
  return items;
};

export const removeGuestItem = (productId) => {
  const items = readRaw().filter((item) => item.productId !== productId);
  writeRaw(items);
  return items;
};

export const clearGuestCart = () => {
  localStorage.removeItem(GUEST_CART_KEY);
};
