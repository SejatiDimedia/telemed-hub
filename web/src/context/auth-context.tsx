import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  setTokens as setApiTokens,
  clearTokens as clearApiTokens,
  getAccessToken,
  refreshAccessToken,
} from "../lib/api-client";

// Types
export type UserRole = "patient" | "doctor" | "pharmacy_staff" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextValue {
  /** Current authenticated user, null if not logged in */
  user: AuthUser | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Set tokens after login/register and decode user from JWT */
  login: (accessToken: string, refreshToken: string) => void;
  /** Clear tokens and user state */
  logout: () => void;
}

// Synchronous module-level cache to prevent React async state update race conditions in router guards
let currentUserSync: AuthUser | null = null;

export function decodeJwtPayload(token: string): AuthUser | null {
  try {
    const parts = token.split(".");
    const payload = parts[1];
    if (!payload) return null;

    const decoded = JSON.parse(atob(payload)) as {
      sub?: string;
      user_id?: string;
      email?: string;
      role?: string;
      roles?: string[];
    };

    const id = decoded.sub ?? decoded.user_id;
    const role = decoded.role ?? decoded.roles?.[0];
    if (!id || !decoded.email || !role) return null;

    return {
      id,
      email: decoded.email,
      role: role as UserRole,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);

  // Coba restore dari access token yang masih ada di memori (page belum di-refresh)
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = getAccessToken();
    currentUserSync = token ? decodeJwtPayload(token) : null;
    return currentUserSync;
  });

  // Restore session on application load (mount)
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedRefresh = localStorage.getItem("refresh_token");
        if (storedRefresh) {
          const success = await refreshAccessToken();
          if (success) {
            const token = getAccessToken();
            if (token) {
              const decoded = decodeJwtPayload(token);
              currentUserSync = decoded;
              setUser(decoded);
            }
          }
        }
      } catch {
        // ignore initialization errors
      } finally {
        setIsInitializing(false);
      }
    }
    restoreSession();
  }, []);

  const login = useCallback((accessToken: string, refreshToken: string) => {
    setApiTokens(accessToken, refreshToken);
    const decoded = decodeJwtPayload(accessToken);
    currentUserSync = decoded;
    setUser(decoded);
  }, []);

  const logout = useCallback(() => {
    clearApiTokens();
    currentUserSync = null;
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      get user() {
        void user; // Mark state as read to satisfy TS compiler while reading from sync cache
        return currentUserSync;
      },
      get isAuthenticated() {
        return currentUserSync !== null;
      },
      login,
      logout,
    }),
    [user, login, logout],
  );

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-background select-none">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-primary text-[48px] animate-spin">
            progress_activity
          </span>
          <p className="font-body text-body-md text-on-surface-variant font-semibold">
            Securing connection...
          </p>
        </div>
      </div>
    );
  }

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
