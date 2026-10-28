"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { FullScreenLoader } from "@/components/states";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) router.replace("/login/");
  }, [ready, user, router]);

  if (!ready || !user) return <FullScreenLoader />;

  return <>{children}</>;
}

// Telas de gestão: aluno que cair aqui (link antigo, URL digitada) volta para os cursos.
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin) router.replace("/cursos/");
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  return <>{children}</>;
}
