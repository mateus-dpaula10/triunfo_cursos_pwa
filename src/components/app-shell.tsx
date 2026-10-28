"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ClipboardList, LogOut, UserRound, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { firstName, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

function useNavItems(): NavItem[] {
  const { isAdmin } = useAuth();

  return [
    { href: "/cursos/", label: "Cursos", icon: BookOpen },
    ...(isAdmin
      ? [
          { href: "/provas/", label: "Provas", icon: ClipboardList },
          { href: "/usuarios/", label: "Usuários", icon: Users },
        ]
      : []),
    { href: "/conta/", label: "Minha conta", icon: UserRound },
  ];
}

function useIsActive() {
  const pathname = usePathname().replace(/\/?$/, "/");
  return (href: string) => pathname === href || pathname.startsWith(href);
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, logout } = useAuth();
  const items = useNavItems();
  const isActive = useIsActive();

  if (!user) return null;

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-card lg:flex">
        <Link href="/cursos/" className="px-6 pt-7 pb-8">
          <img src="/logo.png" alt="Triunfo Cursos" className="w-36" />
        </Link>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive(href) && "bg-secondary text-secondary-foreground hover:bg-secondary hover:text-secondary-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="m-3 flex items-center gap-3 rounded-xl border p-3">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-muted-foreground">{isAdmin ? "Administrador" : "Aluno"}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Sair"
            title="Sair"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      {/* Topo (celular) */}
      <header className="pt-safe sticky top-0 z-30 border-b bg-card/90 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/cursos/">
            <img src="/logo.png" alt="Triunfo Cursos" className="h-6 w-auto" />
          </Link>
          <Link href="/conta/" className="flex items-center gap-2 text-sm font-medium" aria-label="Minha conta">
            <span className="max-w-32 truncate text-muted-foreground">Olá, {firstName(user.name)}</span>
            <Avatar name={user.name} className="size-8" />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-12">{children}</main>

      {/* Abas (celular) */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground",
                  active && "text-primary",
                )}
              >
                <span className={cn("rounded-full px-4 py-1 transition-colors", active && "bg-secondary")}>
                  <Icon className="size-5" />
                </span>
                {label === "Minha conta" ? "Conta" : label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
