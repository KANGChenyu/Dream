import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { api } from "../api/client";
import type { SendSmsResponse, TokenResponse, UserResponse } from "../api/types";

const TOKEN_KEY = "dreamlog_token";
const USER_KEY = "dreamlog_user";

interface AuthContextValue {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  sendCode: (phone: string) => Promise<SendSmsResponse>;
  login: (phone: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser() {
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as UserResponse;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<UserResponse | null>(() => readStoredUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      sendCode: (phone) => api.post<SendSmsResponse>("/auth/sms/send", { phone }),
      login: async (phone, code) => {
        const response = await api.post<TokenResponse>("/auth/login/phone", { phone, code });
        localStorage.setItem(TOKEN_KEY, response.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        setToken(response.access_token);
        setUser(response.user);
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      }
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
