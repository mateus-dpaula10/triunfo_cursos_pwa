"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, PasswordInput, inputClass } from "@/components/form";
import { FullScreenLoader } from "@/components/states";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { maskCpf, onlyDigits } from "@/lib/format";

export default function LoginPage() {
  const { user, ready, login } = useAuth();
  const router = useRouter();
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ cpf?: string; password?: string; form?: string }>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/cursos/");
  }, [ready, user, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (onlyDigits(cpf).length !== 11) {
      setErrors({ cpf: "Digite os 11 números do CPF." });
      return;
    }

    setPending(true);
    setErrors({});

    try {
      await login(onlyDigits(cpf), password);
      router.replace("/cursos/");
    } catch (error) {
      if (error instanceof ApiError && (error.field("cpf") || error.field("password"))) {
        setErrors({ cpf: error.field("cpf"), password: error.field("password") });
      } else {
        setErrors({ form: error instanceof Error ? error.message : "Não foi possível entrar." });
      }
      setPending(false);
    }
  }

  if (!ready || user) return <FullScreenLoader />;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Lado da marca (só desktop) */}
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-[url(/bg-login.webp)] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/85 to-[#9a3c06]/90" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <img src="/logo-white.png" alt="Triunfo Cursos" className="w-44" />
          <div className="max-w-md">
            <h2 className="text-4xl leading-tight font-bold">Seu caminho até a aprovação começa aqui.</h2>
            <p className="mt-4 text-white/85">
              Acesse sua apostila, faça a prova do seu curso e acompanhe o seu resultado.
            </p>
          </div>
          <p className="text-sm text-white/70">Triunfo Cursos Preparatórios</p>
        </div>
      </div>

      {/* Formulário */}
      <div className="pt-safe flex flex-col">
        <div className="bg-primary px-6 pt-10 pb-16 lg:hidden">
          <img src="/logo-white.png" alt="Triunfo Cursos" className="mx-auto w-40" />
        </div>

        <div className="-mt-10 flex flex-1 items-start justify-center px-4 pb-10 lg:mt-0 lg:items-center">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl shadow-black/5 ring-1 ring-foreground/5 lg:shadow-none lg:ring-0"
          >
            <h1 className="text-2xl font-bold">Entrar</h1>
            <p className="mt-1 text-sm text-muted-foreground">Use o seu CPF e a sua senha.</p>

            {errors.form && (
              <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.form}
              </p>
            )}

            <div className="mt-6 grid gap-4">
              <Field label="CPF" error={errors.cpf}>
                {(id, invalid) => (
                  <Input
                    id={id}
                    inputMode="numeric"
                    autoComplete="username"
                    placeholder="000.000.000-00"
                    className={inputClass}
                    value={cpf}
                    onChange={(e) => setCpf(maskCpf(e.target.value))}
                    aria-invalid={invalid}
                    autoFocus
                  />
                )}
              </Field>

              <Field
                label="Senha"
                error={errors.password}
                hint="Primeiro acesso? A senha é a sua data de nascimento, só números (ex.: 09052001)."
              >
                {(id, invalid) => (
                  <PasswordInput
                    id={id}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={invalid}
                  />
                )}
              </Field>
            </div>

            <Button type="submit" className="mt-6 h-11 w-full text-base" disabled={pending || !cpf || !password}>
              {pending ? <Loader2 className="animate-spin" /> : <>Entrar <ArrowRight /></>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
