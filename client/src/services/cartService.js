import apiClient from './apiClient';
import { getProductById } from './productService';
import { getToken } from './session';
import * as guestCart from './guestCart';
import { effectiveMoq, getEffectivePrice } from '../utils/pricing';
import { pluralizeUnit } from '../utils/units';

export const CART_CHANGED_EVENT = 'vastra:cart-changed';

// Cart is a Buyer-only feature — checks the Buyer session specifically.
const isAuthenticated = () => Boolean(getToken('buyer'));

// Lets the nav badge update the moment a cart write succeeds, without every
// page having to share cart state.
const announce = (data) => {
  const count = data?.cart?.items?.length ?? 0;
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT, { detail: { count } }));
  return data;
};

const guestError = (message) => {
  const error = new Error(message);
  error.response = { data: { error: message } };
  return error;
};

// Guests never hit the cart API, so the same MOQ/stock rules the server
// applies (server/src/modules/cart/cart.service.js) are checked here too.
const assertGuestLineValid = (product, quantity) => {
  const moq = effectiveMoq(product);
  if (quantity < moq) throw guestError(`Minimum order is ${moq} ${pluralizeUnit(product.unit, moq)}`);
  if (product.status !== 'available' || product.stock <= 0) throw guestError(`${product.name} is currently out of stock`);
  if (quantity > product.stock) {
    throw guestError(`Only ${product.stock} ${pluralizeUnit(product.unit, product.stock)} of ${product.name} available`);
  }
};

// Turns the guest cart's { productId, quantity } pairs into the same shape
// the backend returns for a logged-in buyer's cart, so CartPage/CheckoutPage
// work identically for guests and buyers.
const hydrateGuestCart = async () => {
  const raw = guestCart.getRawGuestCart();
  const items = (
    await Promise.all(
      raw.map(async ({ productId, quantity }) => {
        try {
          const { product } = await getProductById(productId);
          return { productId: product, quantity, priceAtAdd: getEffectivePrice(product, quantity) };
        } catch {
          return null; // product was removed/unavailable — drop it
        }
      })
    )
  ).filter(Boolean);
  return { cart: { items } };
};

export const getCart = async () => {
  if (isAuthenticated()) {
    const response = await apiClient.get('/cart', { authRole: 'buyer' });
    return announce(response.data);
  }
  return announce(await hydrateGuestCart());
};

export const getCartCount = async () => {
  if (!isAuthenticated()) return guestCart.getRawGuestCart().length;
  const response = await apiClient.get('/cart', { authRole: 'buyer' });
  return response.data.cart?.items?.length ?? 0;
};

export const addToCart = async (productId, quantity) => {
  if (isAuthenticated()) {
    const response = await apiClient.post('/cart/items', { productId, quantity }, { authRole: 'buyer' });
    return announce(response.data);
  }
  const { product } = await getProductById(productId);
  const existing = guestCart.getRawGuestCart().find((item) => item.productId === productId);
  assertGuestLineValid(product, (existing?.quantity || 0) + quantity);
  guestCart.addGuestItem(productId, quantity);
  return announce(await hydrateGuestCart());
};

export const updateCartItem = async (productId, quantity) => {
  if (isAuthenticated()) {
    const response = await apiClient.patch(`/cart/items/${productId}`, { quantity }, { authRole: 'buyer' });
    return announce(response.data);
  }
  const { product } = await getProductById(productId);
  assertGuestLineValid(product, quantity);
  guestCart.setGuestItemQuantity(productId, quantity);
  return announce(await hydrateGuestCart());
};

export const removeCartItem = async (productId) => {
  if (isAuthenticated()) {
    const response = await apiClient.delete(`/cart/items/${productId}`, { authRole: 'buyer' });
    return announce(response.data);
  }
  guestCart.removeGuestItem(productId);
  return announce(await hydrateGuestCart());
};

// Called right after a buyer logs in — folds anything they added as a guest
// into their real account cart, then clears local guest storage. Items the
// server rejects (sold out, below MOQ) are skipped rather than blocking login.
export const mergeGuestCartIntoAccount = async () => {
  const raw = guestCart.getRawGuestCart();
  if (raw.length === 0) return;

  for (const { productId, quantity } of raw) {
    await apiClient.post('/cart/items', { productId, quantity }, { authRole: 'buyer' }).catch(() => {});
  }
  guestCart.clearGuestCart();
  getCartCount()
    .then((count) => window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT, { detail: { count } })))
    .catch(() => {});
};
