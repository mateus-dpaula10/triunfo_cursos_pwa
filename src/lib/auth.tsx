"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api, getToken, setToken, setUnauthorizedHandler } from "@/lib/api";
import type { User } from "@/lib/types";

const USER_KEY = "triunfo.user";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  isAdmin: boolean;
  login: (cpf: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readCachedUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function cacheUser(user: User | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const clearSession = useCallback(() => {
    setToken(null);
    cacheUser(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Abre com o usuário salvo (o app funciona na hora) e atualiza pelo /me em seguida.
  useEffect(() => {
    const token = getToken();
    const cached = token ? readCachedUser() : null;

    // Tem que ser depois da hidratação: o HTML estático não sabe quem está logado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(cached);
    setReady(true);

    if (token) {
      api<User>("/me")
        .then((fresh) => {
          cacheUser(fresh);
          setUser(fresh);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      router.replace("/login/");
    });

    return () => setUnauthorizedHandler(null);
  }, [clearSession, router]);

  const login = useCallback(async (cpf: string, password: string) => {
    const data = await api<{ token: string; user: User }>("/login", {
      method: "POST",
      body: { cpf, password },
    });

    setToken(data.token);
    cacheUser(data.user);
    setUser(data.user);

    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api("/logout", { method: "POST" }).catch(() => {});
    clearSession();
    router.replace("/login/");
  }, [clearSession, router]);

  const value = useMemo(
    () => ({ user, ready, isAdmin: user?.role === "admin", login, logout }),
    [user, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth fora do AuthProvider");
  return context;
}
