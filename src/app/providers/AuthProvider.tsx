import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getRestaurantId } from '../../config/app';
import { auth } from '../../config/firebase';
import {
  loginWithEmail,
  logoutAdmin,
  resolveRestaurantAdminAccess,
  type ResolvedAdminAccess,
} from '../../features/auth/services/authService';
import type { AdminRole, RestaurantMember } from '../../types';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthorizedAdmin: boolean;
  role: AdminRole | null;
  membership: RestaurantMember | null;
  denialReason: string | null;
  restaurantId: string;
  login: (email: string, password: string) => Promise<ResolvedAdminAccess>;
  logout: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const restaurantId = getRestaurantId();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [access, setAccess] = useState<ResolvedAdminAccess>({
    isAuthorized: false,
    role: null,
    membership: null,
    restaurantId,
  });

  const verifyUserAccess = useCallback(
    async (firebaseUser: User | null): Promise<ResolvedAdminAccess> => {
      if (!firebaseUser) {
        const empty: ResolvedAdminAccess = {
          isAuthorized: false,
          role: null,
          membership: null,
          restaurantId,
        };
        setAccess(empty);
        return empty;
      }

      const resolved = await resolveRestaurantAdminAccess(firebaseUser, restaurantId);
      setAccess(resolved);
      return resolved;
    },
    [restaurantId]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(true);
      await verifyUserAccess(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [verifyUserAccess]);

  const login = useCallback(
    async (email: string, password: string): Promise<ResolvedAdminAccess> => {
      setLoading(true);
      try {
        const loggedInUser = await loginWithEmail(email, password);
        setUser(loggedInUser);
        const resolved = await verifyUserAccess(loggedInUser);
        return resolved;
      } finally {
        setLoading(false);
      }
    },
    [verifyUserAccess]
  );

  const logout = useCallback(async () => {
    await logoutAdmin();
    setUser(null);
    setAccess({
      isAuthorized: false,
      role: null,
      membership: null,
      restaurantId,
    });
  }, [restaurantId]);

  const refreshPermissions = useCallback(async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    await verifyUserAccess(auth.currentUser);
    setLoading(false);
  }, [verifyUserAccess]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthorizedAdmin: access.isAuthorized,
        role: access.role,
        membership: access.membership,
        denialReason: access.denialReason ?? null,
        restaurantId,
        login,
        logout,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

