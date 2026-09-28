import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';
import {
  SESSION_EXPIRED_EVENT,
  SESSION_KEYS,
  clearSession,
  readStoredSession,
  writeProfile,
  writeSession,
} from '../services/session';

const OTHER_ROLE = { buyer: 'supplier', supplier: 'buyer' };

/**
 * Builds an independent auth context for one role. Buyer and Supplier each get
 * their own context instance, storage keys and event handling — neither can
 * read, overwrite or clear the other's session.
 */
export function createRoleAuthContext(role, { onSignedIn } = {}) {
  const AuthContext = createContext(null);

  function AuthProvider({ children }) {
    const [user, setUser] = useState(() => readStoredSession(role));

    // Revalidate a restored session once on load: the server is the authority
    // on whether the token is still good (a 401 clears it via the API client).
    useEffect(() => {
      if (!readStoredSession(role)) return;
      let cancelled = false;
      authService
        .getSessionUser(role)
        .then(({ user: fresh }) => {
          if (cancelled || fresh.role !== role) return;
          setUser((prev) => {
            const next = { ...prev, ...fresh };
            writeProfile(role, next);
            return next;
          });
        })
        .catch(() => {}); // offline: keep the local session; 401 is handled globally
      return () => {
        cancelled = true;
      };
    }, []);

    // Server rejected this role's token, or another tab signed in/out.
    useEffect(() => {
      const onExpired = (e) => {
        if (e.detail?.role === role) setUser(null);
      };
      const onStorage = (e) => {
        if (e.key === null || Object.values(SESSION_KEYS[role]).includes(e.key)) setUser(readStoredSession(role));
      };
      window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
      window.addEventListener('storage', onStorage);
      return () => {
        window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
        window.removeEventListener('storage', onStorage);
      };
    }, []);

    const startSession = useCallback(async (data) => {
      writeSession(role, data.token, data.user);
      setUser(data.user);
      if (onSignedIn) await onSignedIn().catch(() => {});
      return data.user;
    }, []);

    const loginUser = useCallback(
      async (email, password) => {
        const data = await authService.login(email, password, role);
        // The Supplier login must never authenticate a Buyer, and vice versa —
        // enforced here so it can't be bypassed by any caller of this context.
        if (data.user.role !== role) {
          throw new Error(`This account isn't registered as a ${role}. Please use the ${OTHER_ROLE[role]} login instead.`);
        }
        return startSession(data);
      },
      [startSession]
    );

    const registerUser = useCallback(
      async (email, password) => startSession(await authService.register(email, password, role)),
      [startSession]
    );

    const updateProfile = useCallback((patch) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        writeProfile(role, next);
        return next;
      });
    }, []);

    const logout = useCallback(() => {
      clearSession(role); // this role's keys only
      setUser(null);
    }, []);

    const value = useMemo(
      () => ({ user, isLoggedIn: Boolean(user), loginUser, registerUser, updateProfile, logout }),
      [user, loginUser, registerUser, updateProfile, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  const useAuth = () => useContext(AuthContext);

  return { AuthProvider, useAuth };
}
