"use client";

import { useEffect, useState } from "react";
import { Download, KeyRound, Loader2, LogOut, Share } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, PasswordInput } from "@/components/form";
import { PageHeader } from "@/components/states";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { initials, maskCpf, maskPhone } from "@/lib/format";
import { useCourses } from "@/lib/queries";

export default function AccountPage() {
  const { user, isAdmin, logout } = useAuth();
  const { data: courses } = useCourses();
  const course = courses?.find((c) => c.id === user!.course_id);

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <PageHeader title="Minha conta" />

      <section className="flex items-center gap-4 rounded-2xl border bg-card p-5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
          {initials(user!.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{user!.name}</p>
          <p className="text-sm text-muted-foreground">{isAdmin ? "Administrador" : course?.title ?? "Aluno"}</p>
        </div>
      </section>

      <section className="grid gap-3 rounded-2xl border bg-card p-5 text-sm sm:grid-cols-2">
        <Info label="CPF" value={maskCpf(user!.cpf)} />
        <Info label="Telefone" value={user!.phone ? maskPhone(user!.phone) : "—"} />
        <Info
          label="Data de nascimento"
          value={user!.birth_date ? new Date(user!.birth_date + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
        />
      </section>

      <ChangePassword />
      <InstallApp />

      <Button variant="outline" className="h-12 bg-card text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={logout}>
        <LogOut /> Sair da conta
      </Button>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function ChangePassword() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const mismatch = confirmation.length > 0 && password !== confirmation;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirmation) return setError("As senhas não são iguais.");

    setPending(true);
    setError(undefined);

    try {
      await api("/me/password", { method: "POST", body: { password, password_confirmation: confirmation } });
      toast.success("Senha alterada. Use a nova senha no próximo acesso.");
      setPassword("");
      setConfirmation("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível alterar a senha.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <KeyRound className="size-5 text-primary" />
        <h2 className="font-bold">Trocar senha</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nova senha" hint="Mínimo de 6 caracteres." error={error}>
          {(id, invalid) => (
            <PasswordInput id={id} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={invalid} />
          )}
        </Field>
        <Field label="Repita a nova senha" error={mismatch ? "As senhas não são iguais." : undefined}>
          {(id, invalid) => (
            <PasswordInput id={id} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} aria-invalid={invalid} />
          )}
        </Field>
      </div>
      <Button type="submit" className="h-11 sm:w-fit sm:px-6" disabled={pending || !password || !confirmation}>
        {pending && <Loader2 className="animate-spin" />}
        Salvar nova senha
      </Button>
    </form>
  );
}

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

// Botão "Instalar app" (Android/Chrome) ou instrução do Safari (iPhone).
function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios] = useState(() => /iphone|ipad|ipod/i.test(navigator.userAgent));
  const [installed] = useState(() => window.matchMedia("(display-mode: standalone)").matches);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (installed || (!prompt && !ios)) return null;

  return (
    <section className="flex items-start gap-4 rounded-2xl border border-primary/30 bg-secondary/50 p-5">
      <img src="/icon-192.png" alt="" className="size-12 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">Instale o app da Triunfo</p>
        {prompt ? (
          <>
            <p className="mt-0.5 text-sm text-muted-foreground">Acesse direto da tela inicial, sem abrir o navegador.</p>
            <Button
              className="mt-3 h-10"
              onClick={async () => {
                await prompt.prompt();
                setPrompt(null);
              }}
            >
              <Download /> Instalar
            </Button>
          </>
        ) : (
          <p className="mt-0.5 text-sm text-muted-foreground">
            No Safari, toque em <Share className="inline size-4 align-text-bottom" /> <b>Compartilhar</b> e depois em{" "}
            <b>Adicionar à Tela de Início</b>.
          </p>
        )}
      </div>
    </section>
  );
}
