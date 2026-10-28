"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, inputClass } from "@/components/form";
import { api, ApiError } from "@/lib/api";
import { keys } from "@/lib/queries";
import type { Course } from "@/lib/types";

// Criar (sem course) ou editar curso. Vai como multipart por causa do PDF.
export function CourseFormDialog({
  open,
  onOpenChange,
  course,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course;
}) {
  const [pending, setPending] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        {/* Montado a cada abertura: o formulário começa sempre com os dados atuais. */}
        <CourseForm course={course} pending={pending} setPending={setPending} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CourseForm({
  course,
  pending,
  setPending,
  onDone,
}: {
  course?: Course;
  pending: boolean;
  setPending: (pending: boolean) => void;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [pdf, setPdf] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!course && !pdf) {
      setErrors({ pdf: "Escolha o PDF da apostila." });
      return;
    }

    const body = new FormData();
    body.append("title", title);
    body.append("description", description);
    if (pdf) body.append("pdf", pdf);

    setPending(true);
    setErrors({});

    try {
      await api(course ? `/admin/courses/${course.id}` : "/admin/courses", { method: "POST", body });
      toast.success(course ? "Curso atualizado." : "Curso cadastrado.");
      queryClient.invalidateQueries({ queryKey: keys.courses });
      setPending(false);
      onDone();
    } catch (error) {
      setPending(false);
      if (error instanceof ApiError && Object.keys(error.errors).length) {
        setErrors({ title: error.field("title"), description: error.field("description"), pdf: error.field("pdf") });
      } else {
        toast.error((error as Error).message);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{course ? "Editar curso" : "Novo curso"}</DialogTitle>
        <DialogDescription>
          {course ? "Altere os dados ou troque a apostila." : "Cadastre o curso com a apostila em PDF."}
        </DialogDescription>
      </DialogHeader>

      <Field label="Título do curso" error={errors.title}>
        {(id, invalid) => (
          <Input id={id} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required aria-invalid={invalid} />
        )}
      </Field>

      <Field label="Descrição" error={errors.description}>
        {(id, invalid) => (
          <Textarea id={id} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} aria-invalid={invalid} />
        )}
      </Field>

      <Field
        label="Apostila (PDF)"
        error={errors.pdf}
        hint={course?.pdf_url ? "Deixe em branco para manter a apostila atual." : "Até 20 MB."}
      >
        {(id) => (
          <>
            <input
              ref={fileRef}
              id={id}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-3 rounded-xl border border-dashed border-input px-4 py-4 text-left text-sm transition-colors hover:border-primary hover:bg-secondary/40"
            >
              <FileUp className="size-5 shrink-0 text-primary" />
              <span className="min-w-0 truncate">
                {pdf ? pdf.name : course?.pdf_url ? "Trocar apostila…" : "Escolher arquivo PDF…"}
              </span>
            </button>
          </>
        )}
      </Field>

      <DialogFooter>
        <Button type="button" variant="outline" className="h-10" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" className="h-10 px-5" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {course ? "Salvar" : "Cadastrar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
