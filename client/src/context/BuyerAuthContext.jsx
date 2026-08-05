import { createContext, useContext, useState } from 'react';
import * as authService from '../services/authService';
import { mergeGuestCartIntoAccount } from '../services/cartService';

const BuyerAuthContext = createContext(null);

// Buyer session lives entirely under its own storage keys so it can never
// collide with — or be overwritten by — the Supplier session below.
const TOKEN_KEY = 'buyerToken';
const PROFILE_KEY = 'buyerProfile';
const LOGGED_IN_KEY = 'buyerLoggedIn';

function readStoredProfile() {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export const BuyerAuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredProfile);

  const persistSession = (token, profile) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(LOGGED_IN_KEY, 'true');
    setUser(profile);
  };

  const loginUser = async (email, password) => {
    const data = await authService.login(email, password);
    // The Supplier login must never authenticate a Buyer, and vice versa —
    // enforced here so it can't be bypassed by any caller of this context.
    if (data.user.role !== 'buyer') {
      throw { response: { data: { error: `This account isn't registered as a buyer. Please use the supplier login instead.` } } };
    }
    persistSession(data.token, data.user);
    // Fold anything they added to the cart before logging in into their account.
    await mergeGuestCartIntoAccount().catch(() => {});
    return data.user;
  };

  const registerUser = async (email, password) => {
    const data = await authService.register(email, password, 'buyer');
    persistSession(data.token, data.user);
    await mergeGuestCartIntoAccount().catch(() => {});
    return data.user;
  };

  const updateProfile = (patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    // Clears only the Buyer session — Supplier session (different keys) is untouched.
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(LOGGED_IN_KEY);
    setUser(null);
  };

  const isLoggedIn = Boolean(user) && localStorage.getItem(LOGGED_IN_KEY) === 'true';

  return (
    <BuyerAuthContext.Provider value={{ user, isLoggedIn, loginUser, registerUser, updateProfile, logout }}>
      {children}
    </BuyerAuthContext.Provider>
  );
};

export const useBuyerAuth = () => useContext(BuyerAuthContext);
