"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, PasswordInput, inputClass, selectClass } from "@/components/form";
import { useCourses } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { birthDateToPassword, maskCpf, maskPhone, onlyDigits } from "@/lib/format";
import type { Role, User } from "@/lib/types";

export type UserPayload = {
  name: string;
  cpf: string;
  birth_date: string;
  password: string;
  phone: string;
  role: Role;
  description: string;
  course_id: number | null;
};

// Formulário de aluno/admin. No cadastro a senha acompanha a data de nascimento
// (ddmmaaaa), como no sistema web; na edição, senha em branco mantém a atual.
export function UserForm({
  user,
  submitLabel,
  onSubmit,
}: {
  user?: User;
  submitLabel: string;
  onSubmit: (payload: UserPayload) => Promise<unknown>;
}) {
  const { data: courses } = useCourses();
  const [name, setName] = useState(user?.name ?? "");
  const [cpf, setCpf] = useState(maskCpf(user?.cpf ?? ""));
  const [birthDate, setBirthDate] = useState(user?.birth_date ?? "");
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [phone, setPhone] = useState(maskPhone(user?.phone ?? ""));
  const [role, setRole] = useState<Role>(user?.role ?? "user");
  const [courseId, setCourseId] = useState(user?.course_id ? String(user.course_id) : "");
  const [description, setDescription] = useState(user?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [pending, setPending] = useState(false);

  function handleBirthDate(value: string) {
    setBirthDate(value);
    if (!user && !passwordTouched) setPassword(birthDateToPassword(value));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrors({});

    try {
      await onSubmit({
        name,
        cpf: onlyDigits(cpf),
        birth_date: birthDate,
        password,
        phone,
        role,
        description,
        course_id: courseId ? Number(courseId) : null,
      });
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.errors).length) {
        setErrors(Object.fromEntries(Object.entries(error.errors).map(([k, v]) => [k, v[0]])));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <Field label="Nome completo" error={errors.name}>
        {(id, invalid) => (
          <Input id={id} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required aria-invalid={invalid} />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="CPF" error={errors.cpf}>
          {(id, invalid) => (
            <Input
              id={id}
              inputMode="numeric"
              placeholder="000.000.000-00"
              className={inputClass}
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
              required
              aria-invalid={invalid}
            />
          )}
        </Field>
        <Field label="Data de nascimento" error={errors.birth_date}>
          {(id, invalid) => (
            <Input
              id={id}
              type="date"
              className={inputClass}
              value={birthDate}
              onChange={(e) => handleBirthDate(e.target.value)}
              required
              aria-invalid={invalid}
            />
          )}
        </Field>
      </div>

      <Field
        label={user ? "Nova senha" : "Senha"}
        error={errors.password}
        hint={user ? "Deixe em branco para manter a senha atual." : "Preenchida com a data de nascimento (ddmmaaaa). Pode trocar."}
      >
        {(id, invalid) => (
          <PasswordInput
            id={id}
            autoComplete="new-password"
            placeholder={user ? "Manter senha atual" : undefined}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordTouched(true);
            }}
            aria-invalid={invalid}
          />
        )}
      </Field>

      <Field label="Telefone" error={errors.phone}>
        {(id, invalid) => (
          <Input
            id={id}
            type="tel"
            inputMode="tel"
            placeholder="(00) 00000-0000"
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            aria-invalid={invalid}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de usuário" error={errors.role}>
          {(id) => (
            <select id={id} className={selectClass} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="user">Aluno</option>
              <option value="admin">Administrador</option>
            </select>
          )}
        </Field>
        <Field label="Curso" error={errors.course_id}>
          {(id) => (
            <select id={id} className={selectClass} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Sem curso</option>
              {courses?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <Field label="Descrição" error={errors.description} hint="Observações internas (não aparece para o aluno).">
        {(id) => <Textarea id={id} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />}
      </Field>

      <Button type="submit" className="mt-2 h-12 text-base" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  );
}
