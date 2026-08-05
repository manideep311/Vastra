import apiClient from './apiClient';
import { getProductById } from './productService';
import * as guestCart from './guestCart';

// Cart is a Buyer-only feature — checks the Buyer session specifically.
const isAuthenticated = () => Boolean(localStorage.getItem('buyerToken'));

// A product's real minimum — unset/1 means no minimum at all. Mirrors the
// backend's rule (server/src/modules/cart/cart.service.js) so guests get the
// same enforcement even though their cart never touches the API.
const effectiveMoq = (product) => (product.moq > 1 ? product.moq : 1);

const assertMeetsMoq = (product, quantity) => {
  const moq = effectiveMoq(product);
  if (quantity < moq) {
    const message = `Minimum order is ${moq} ${product.unit || 'unit'}${moq === 1 ? '' : 's'}`;
    const error = new Error(message);
    error.response = { data: { error: message } };
    throw error;
  }
};

// Turns the guest cart's { productId, quantity } pairs into the same shape
// the backend returns for a logged-in buyer's cart: { cart: { items: [{ productId: <product>, quantity, priceAtAdd }] } }.
// This lets CartPage/CheckoutPage/etc. work identically for guests and buyers.
const hydrateGuestCart = async () => {
  const raw = guestCart.getRawGuestCart();
  const items = (
    await Promise.all(
      raw.map(async ({ productId, quantity }) => {
        try {
          const { product } = await getProductById(productId);
          return { productId: product, quantity, priceAtAdd: product.price };
        } catch {
          return null; // product was removed/unavailable — drop it silently
        }
      })
    )
  ).filter(Boolean);
  return { cart: { items } };
};

export const getCart = async () => {
  if (isAuthenticated()) {
    const response = await apiClient.get('/cart');
    return response.data;
  }
  return hydrateGuestCart();
};

export const addToCart = async (productId, quantity) => {
  if (isAuthenticated()) {
    const response = await apiClient.post('/cart/items', { productId, quantity });
    return response.data;
  }
  // Guests never hit the backend for cart writes, so MOQ has to be checked
  // here against the same rule the server applies once they log in.
  const { product } = await getProductById(productId);
  const existing = guestCart.getRawGuestCart().find((item) => item.productId === productId);
  assertMeetsMoq(product, (existing?.quantity || 0) + quantity);
  guestCart.addGuestItem(productId, quantity);
  return hydrateGuestCart();
};

export const updateCartItem = async (productId, quantity) => {
  if (isAuthenticated()) {
    const response = await apiClient.patch(`/cart/items/${productId}`, { quantity });
    return response.data;
  }
  const { product } = await getProductById(productId);
  assertMeetsMoq(product, quantity);
  guestCart.setGuestItemQuantity(productId, quantity);
  return hydrateGuestCart();
};

export const removeCartItem = async (productId) => {
  if (isAuthenticated()) {
    const response = await apiClient.delete(`/cart/items/${productId}`);
    return response.data;
  }
  guestCart.removeGuestItem(productId);
  return hydrateGuestCart();
};

// Called right after a buyer logs in — folds anything they added as a guest
// into their real account cart, then clears local guest storage.
export const mergeGuestCartIntoAccount = async () => {
  const raw = guestCart.getRawGuestCart();
  if (raw.length === 0) return;

  for (const { productId, quantity } of raw) {
    try {
      await apiClient.post('/cart/items', { productId, quantity });
    } catch (err) {
      console.error('Failed to merge guest cart item', err);
    }
  }
  guestCart.clearGuestCart();
};
