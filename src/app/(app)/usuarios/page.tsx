"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, RotateCcw, Search, Trash2, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RequireAdmin } from "@/components/guards";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UserForm, type UserPayload } from "@/components/user-form";
import { EmptyState, ErrorState, PageHeader } from "@/components/states";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { keys, useUsers } from "@/lib/queries";
import { formatDateTime, formatScore, initials, maskCpf, PASSING_SCORE } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/lib/types";

export default function UsersPage() {
  return (
    <RequireAdmin>
      <UsersAdmin />
    </RequireAdmin>
  );
}

function UsersAdmin() {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data, isPending, isFetching, error, refetch } = useUsers(search, page);
  // Vem da lista: depois de salvar/resetar o painel já mostra os dados novos.
  const selected = data?.data.find((u) => u.id === selectedId) ?? null;

  // Busca enquanto digita (com uma pausa curta para não disparar a cada tecla).
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [input]);

  return (
    <>
      <PageHeader
        title="Usuários"
        description={data ? `${data.total} ${data.total === 1 ? "usuário cadastrado" : "usuários cadastrados"}` : "Alunos e administradores"}
        action={
          <Link href="/usuarios/novo/" className={cn(buttonVariants(), "h-10 px-4")}>
            <Plus /> Novo usuário
          </Link>
        }
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Buscar por nome ou CPF"
          className="h-12 bg-card pl-10 text-base md:text-sm"
          aria-label="Buscar usuário"
        />
      </div>

      {isPending ? (
        <div className="grid gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : data.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "Ninguém encontrado" : "Nenhum usuário"}
          description={search ? `Nenhum usuário com "${search}" no nome ou CPF.` : undefined}
        />
      ) : (
        <>
          <ul className={cn("grid gap-2 transition-opacity", isFetching && "opacity-60")}>
            {data.data.map((user) => (
              <li key={user.id}>
                <UserRow user={user} onOpen={() => setSelectedId(user.id)} />
              </li>
            ))}
          </ul>

          {data.last_page > 1 && (
            <div className="mt-5 flex items-center justify-between gap-3">
              <Button variant="outline" className="h-10" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                <ChevronLeft /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {data.current_page} de {data.last_page}
              </span>
              <Button variant="outline" className="h-10" onClick={() => setPage((p) => p + 1)} disabled={page >= data.last_page}>
                Próxima <ChevronRight />
              </Button>
            </div>
          )}
        </>
      )}

      <UserSheet user={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}

function UserRow({ user, onOpen }: { user: AdminUser; onOpen: () => void }) {
  const last = user.last_attempt;
  const approved = last && last.score >= PASSING_SCORE;

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 sm:p-4"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
        {initials(user.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold">{user.name}</p>
          {user.role === "admin" && <Badge variant="secondary">Admin</Badge>}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {maskCpf(user.cpf)} · {user.course_title ?? "Sem curso"}
        </p>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        {last ? (
          <>
            <p className={cn("font-bold tabular-nums", approved ? "text-success" : "text-destructive")}>{formatScore(last.score)}</p>
            <p className="text-xs text-muted-foreground">{last.attempts_count}/3 tentativas</p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Sem tentativas</p>
        )}
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function UserSheet({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: keys.allUsers });

  async function handleSave(payload: UserPayload) {
    try {
      await api(`/admin/users/${user!.id}`, { method: "PATCH", body: payload });
      toast.success("Usuário atualizado.");
      refresh();
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  }

  async function handleReset() {
    try {
      await api(`/admin/users/${user!.id}/attempts`, { method: "DELETE" });
      toast.success("Tentativas resetadas. O aluno pode fazer a prova de novo.");
      refresh();
      queryClient.invalidateQueries({ queryKey: keys.adminExams });
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  }

  async function handleDelete() {
    try {
      await api(`/admin/users/${user!.id}`, { method: "DELETE" });
      toast.success("Usuário excluído.");
      refresh();
      onClose();
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  }

  const last = user?.last_attempt;

  return (
    <Sheet open={!!user} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {user && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="pr-8">{user.name}</SheetTitle>
              <SheetDescription>{user.course_title ?? "Sem curso"}</SheetDescription>
            </SheetHeader>

            <div className="grid gap-6 px-4 pb-8">
              <section className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Última prova</p>
                {last ? (
                  <div className="mt-2 grid gap-1 text-sm">
                    <p className="font-semibold">{last.exam_title ?? "—"}</p>
                    <p>
                      Nota{" "}
                      <b className={last.score >= PASSING_SCORE ? "text-success" : "text-destructive"}>{formatScore(last.score)}</b> · {last.attempts_count} de 3 tentativas
                    </p>
                    <p className="text-muted-foreground">{formatDateTime(last.created_at)}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Ainda não fez nenhuma prova.</p>
                )}
                <Button variant="outline" className="mt-3 h-10 w-full bg-card" onClick={() => setResetting(true)} disabled={!last}>
                  <RotateCcw /> Resetar tentativas
                </Button>
              </section>

              <UserForm key={user.id} user={user} submitLabel="Salvar alterações" onSubmit={handleSave} />

              {user.id !== me?.id && (
                <Button
                  variant="ghost"
                  className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 /> Excluir usuário
                </Button>
              )}
            </div>

            <ConfirmDialog
              open={resetting}
              onOpenChange={setResetting}
              title="Resetar tentativas?"
              description={`Todas as tentativas e notas de ${user.name} serão apagadas, e a prova fica liberada de novo.`}
              confirmLabel="Resetar"
              onConfirm={handleReset}
            />
            <ConfirmDialog
              open={deleting}
              onOpenChange={setDeleting}
              title={`Excluir ${user.name}?`}
              description="O acesso e todas as tentativas de prova desse usuário serão apagados. Não dá para desfazer."
              confirmLabel="Excluir usuário"
              onConfirm={handleDelete}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
