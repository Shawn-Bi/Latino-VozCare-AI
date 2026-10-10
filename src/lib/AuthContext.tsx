import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { base44 } from "@/api/base44Client";
import type { User } from "@base44/sdk";

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  user: User | null;
  authError: { type?: string; message?: string } | null;
  // Display state only. Real access is enforced by the data layer / backend, never by this flag.
  isCareTeamApproved: boolean;
  refresh: () => Promise<void>;
  refreshMembership: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoadingAuth: true,
  user: null,
  authError: null,
  isCareTeamApproved: false,
  refresh: async () => {},
  refreshMembership: async () => {},
});

// Fails closed: any read problem counts as "not approved".
async function hasApprovedMembership(userId: string): Promise<boolean> {
  try {
    const page = await base44.entities.CareTeamMembership.filter({ user_id: userId, status: "approved" }, { limit: 1 }) as any;
    return (page.items ?? page).length > 0;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isCareTeamApproved, setIsCareTeamApproved] = useState(false);
  const [authError, setAuthError] = useState<{ type?: string; message?: string } | null>(null);

  const checkAuth = async () => {
    setIsLoadingAuth(true);
    try {
      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        try {
          const u = await base44.auth.me();
          setIsCareTeamApproved(await hasApprovedMembership(u.id));
          setUser(u);
          setIsAuthenticated(true);
          setAuthError(null);
        } catch (err: any) {
          if (err?.status === 403 || err?.response?.status === 403) {
            setAuthError({ type: "user_not_registered", message: err.message });
          } else {
            setAuthError({ message: err.message });
          }
          setIsAuthenticated(false);
          setIsCareTeamApproved(false);
          setUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setIsCareTeamApproved(false);
        setUser(null);
        setAuthError(null);
      }
    } catch (err: any) {
      setAuthError({ message: err.message });
      setIsAuthenticated(false);
      setIsCareTeamApproved(false);
      setUser(null);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const refreshMembership = async () => {
    if (user) setIsCareTeamApproved(await hasApprovedMembership(user.id));
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoadingAuth, user, authError, isCareTeamApproved, refresh: checkAuth, refreshMembership }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}