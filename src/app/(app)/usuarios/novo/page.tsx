"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RequireAdmin } from "@/components/guards";
import { UserForm, type UserPayload } from "@/components/user-form";
import { PageHeader } from "@/components/states";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

export default function NewUserPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleCreate(payload: UserPayload) {
    try {
      await api("/admin/users", { method: "POST", body: payload });
      toast.success(`${payload.name} cadastrado(a).`);
      queryClient.invalidateQueries({ queryKey: keys.allUsers });
      router.push("/usuarios/");
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  }

  return (
    <RequireAdmin>
      <div className="mx-auto max-w-2xl">
        <Link href="/usuarios/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Usuários
        </Link>
        <PageHeader title="Novo usuário" description="O aluno entra com o CPF e a senha cadastrada aqui." />
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <UserForm submitLabel="Cadastrar" onSubmit={handleCreate} />
        </div>
      </div>
    </RequireAdmin>
  );
}
