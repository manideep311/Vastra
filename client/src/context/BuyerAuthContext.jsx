import { createRoleAuthContext } from './createRoleAuthContext';
import { mergeGuestCartIntoAccount } from '../services/cartService';

// Buyer session — its own context and its own storage keys (buyerToken,
// buyerProfile, buyerLoggedIn). Anything added to the cart as a guest is
// folded into the account right after sign-in.
const { AuthProvider, useAuth } = createRoleAuthContext('buyer', {
  onSignedIn: mergeGuestCartIntoAccount,
});

export const BuyerAuthProvider = AuthProvider;
export const useBuyerAuth = useAuth;
