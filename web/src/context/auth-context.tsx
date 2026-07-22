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
  apiClient,
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
  fullName?: string;
  profilePictureUrl?: string;
}

interface AuthContextValue {
  /** Current authenticated user, null if not logged in */
  user: AuthUser | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Set tokens after login/register and decode user from JWT */
  login: (accessToken: string, refreshToken: string) => Promise<void>;
  /** Clear tokens and user state */
  logout: () => void;
  /** Update current user details like profilePictureUrl */
  updateUser: (updates: Partial<AuthUser>) => void;
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
              // Fetch user info for profile_picture_url
              try {
                const response = await apiClient.get<{ full_name: string; profile_picture_url?: string }>("/auth/me");
                decoded!.fullName = response.full_name;
                decoded!.profilePictureUrl = response.profile_picture_url;
              } catch (e) {
                // ignore
              }
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

  const login = useCallback(async (accessToken: string, refreshToken: string) => {
    setApiTokens(accessToken, refreshToken);
    const decoded = decodeJwtPayload(accessToken);
    if (decoded) {
      try {
        const response = await apiClient.get<{ full_name: string; profile_picture_url?: string }>("/auth/me");
        decoded.fullName = response.full_name;
        decoded.profilePictureUrl = response.profile_picture_url;
      } catch (e) {
        // ignore
      }
    }
    currentUserSync = decoded;
    setUser(decoded);
  }, []);

  const logout = useCallback(() => {
    clearApiTokens();
    currentUserSync = null;
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<AuthUser>) => {
    if (currentUserSync) {
      const updated = { ...currentUserSync, ...updates };
      currentUserSync = updated;
      setUser(updated);
    }
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
      updateUser,
    }),
    [user, login, logout, updateUser],
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
