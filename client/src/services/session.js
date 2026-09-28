// Buyer and Supplier sessions are stored under completely separate keys so
// the two can be signed in side by side without ever sharing a token.
export const SESSION_KEYS = {
  buyer: { token: 'buyerToken', profile: 'buyerProfile', loggedIn: 'buyerLoggedIn' },
  supplier: { token: 'supplierToken', profile: 'supplierProfile', loggedIn: 'supplierLoggedIn' },
};

export const SESSION_EXPIRED_EVENT = 'vastra:session-expired';

const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

// Reads the exp claim without verifying the signature — only the server can
// verify. This just lets the client drop a token it already knows is dead
// instead of sending it and rendering a signed-in UI in the meantime.
const readTokenExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return undefined; // malformed
  }
};

export const isTokenUsable = (token) => {
  if (!token || token.split('.').length !== 3) return false;
  const expiry = readTokenExpiry(token);
  if (expiry === undefined) return false;
  return expiry === null || expiry > Date.now() + 5_000;
};

export const getToken = (role) => {
  const token = safeGet(SESSION_KEYS[role].token);
  return isTokenUsable(token) ? token : null;
};

// A token is stored for this role but can no longer be used (expired or
// malformed) — that session should be ended, not silently kept.
export const hasDeadToken = (role) => {
  const token = safeGet(SESSION_KEYS[role].token);
  return Boolean(token) && !isTokenUsable(token);
};

export const readStoredSession = (role) => {
  const keys = SESSION_KEYS[role];
  if (!getToken(role) || safeGet(keys.loggedIn) !== 'true') return null;
  try {
    const profile = JSON.parse(safeGet(keys.profile));
    return profile?.role === role ? profile : null;
  } catch {
    return null;
  }
};

export const writeSession = (role, token, profile) => {
  const keys = SESSION_KEYS[role];
  localStorage.setItem(keys.token, token);
  localStorage.setItem(keys.profile, JSON.stringify(profile));
  localStorage.setItem(keys.loggedIn, 'true');
};

export const writeProfile = (role, profile) => {
  localStorage.setItem(SESSION_KEYS[role].profile, JSON.stringify(profile));
};

export const clearSession = (role) => {
  const keys = SESSION_KEYS[role];
  Object.values(keys).forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // storage unavailable — nothing to clear
    }
  });
};

// Clears one role's session and tells that role's auth context, so the UI
// drops to signed-out instead of staying in a fake authenticated state.
export const expireSession = (role) => {
  clearSession(role);
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { role } }));
};
