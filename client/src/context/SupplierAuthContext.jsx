import { createRoleAuthContext } from './createRoleAuthContext';

// Supplier session — its own context and its own storage keys (supplierToken,
// supplierProfile, supplierLoggedIn), fully independent of the Buyer session.
const { AuthProvider, useAuth } = createRoleAuthContext('supplier');

export const SupplierAuthProvider = AuthProvider;
export const useSupplierAuth = useAuth;
