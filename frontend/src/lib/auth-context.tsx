import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch, getToken, setToken, ApiError } from "@/api/client";

interface AuthResponse {
  token: string;
  username: string;
}

interface AuthContextValue {
  username: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    apiFetch<{ username: string }>("/api/auth/me")
      .then((res) => setUsername(res.username))
      .catch(() => setToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(usernameInput: string, password: string) {
    const res = await apiFetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      auth: false,
      body: { username: usernameInput, password },
    });
    setToken(res.token);
    setUsername(res.username);
  }

  async function signup(usernameInput: string, password: string) {
    const res = await apiFetch<AuthResponse>("/api/auth/signup", {
      method: "POST",
      auth: false,
      body: { username: usernameInput, password },
    });
    setToken(res.token);
    setUsername(res.username);
  }

  function logout() {
    setToken(null);
    setUsername(null);
  }

  return (
    <AuthContext.Provider value={{ username, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };
