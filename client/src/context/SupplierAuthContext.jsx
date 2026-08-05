import { createContext, useContext, useState } from 'react';
import * as authService from '../services/authService';

const SupplierAuthContext = createContext(null);

// Supplier session lives entirely under its own storage keys so it can
// never collide with — or be overwritten by — the Buyer session.
const TOKEN_KEY = 'supplierToken';
const PROFILE_KEY = 'supplierProfile';
const LOGGED_IN_KEY = 'supplierLoggedIn';

function readStoredProfile() {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export const SupplierAuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredProfile);

  const persistSession = (token, profile) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(LOGGED_IN_KEY, 'true');
    setUser(profile);
  };

  const loginUser = async (email, password) => {
    const data = await authService.login(email, password);
    // The Buyer login must never authenticate a Supplier, and vice versa —
    // enforced here so it can't be bypassed by any caller of this context.
    if (data.user.role !== 'supplier') {
      throw { response: { data: { error: `This account isn't registered as a supplier. Please use the buyer login instead.` } } };
    }
    persistSession(data.token, data.user);
    return data.user;
  };

  const registerUser = async (email, password) => {
    const data = await authService.register(email, password, 'supplier');
    persistSession(data.token, data.user);
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
    // Clears only the Supplier session — Buyer session (different keys) is untouched.
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(LOGGED_IN_KEY);
    setUser(null);
  };

  const isLoggedIn = Boolean(user) && localStorage.getItem(LOGGED_IN_KEY) === 'true';

  return (
    <SupplierAuthContext.Provider value={{ user, isLoggedIn, loginUser, registerUser, updateProfile, logout }}>
      {children}
    </SupplierAuthContext.Provider>
  );
};

export const useSupplierAuth = () => useContext(SupplierAuthContext);
