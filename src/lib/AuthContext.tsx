import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { base44 } from "@/api/base44Client";
import type { User } from "@base44/sdk";

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  user: User | null;
  authError: { type?: string; message?: string } | null;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoadingAuth: true,
  user: null,
  authError: null,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<{ type?: string; message?: string } | null>(null);

  const checkAuth = async () => {
    setIsLoadingAuth(true);
    try {
      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        try {
          const u = await base44.auth.me();
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
          setUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setAuthError(null);
      }
    } catch (err: any) {
      setAuthError({ message: err.message });
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoadingAuth, user, authError, refresh: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}