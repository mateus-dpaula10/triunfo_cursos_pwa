"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, ClipboardList, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RequireAdmin } from "@/components/guards";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { QuestionDialog, LETTERS } from "@/components/question-editor";
import { Field, inputClass } from "@/components/form";
import { EmptyState, ErrorState, PageHeader } from "@/components/states";
import { api } from "@/lib/api";
import { keys, useAdminExams } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { AdminExam, AdminQuestion } from "@/lib/types";

export default function ExamsAdminPage() {
  return (
    <RequireAdmin>
      <ExamsAdmin />
    </RequireAdmin>
  );
}

function ExamsAdmin() {
  const { data: exams, isPending, error, refetch } = useAdminExams();

  return (
    <>
      <PageHeader
        title="Provas"
        description="Cada curso tem uma prova. Edite questões, alternativas e a resposta correta."
        action={
          <Link href="/provas/nova/" className={cn(buttonVariants(), "h-10 px-4")}>
            <Plus /> Nova prova
          </Link>
        }
      />

      {isPending ? (
        <div className="grid gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : exams.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma prova cadastrada"
          description="Crie a prova de um curso para os alunos poderem fazer."
          action={
            <Link href="/provas/nova/" className={cn(buttonVariants(), "h-10 px-4")}>
              <Plus /> Nova prova
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4">
          {exams.map((exam) => (
            <ExamCard key={exam.id} exam={exam} defaultOpen={exams.length === 1} />
          ))}
        </div>
      )}
    </>
  );
}

function ExamCard({ exam, defaultOpen }: { exam: AdminExam; defaultOpen: boolean }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(defaultOpen);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);

  async function handleDelete() {
    try {
      await api(`/admin/exams/${exam.id}`, { method: "DELETE" });
      toast.success("Prova excluída.");
      queryClient.invalidateQueries({ queryKey: keys.adminExams });
      queryClient.invalidateQueries({ queryKey: keys.courses });
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-start gap-3 p-5">
        <button onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-expanded={open}>
          <ChevronDown className={cn("mt-1 size-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
          <div className="min-w-0">
            <h2 className="font-bold">{exam.title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {exam.course_title ?? "Curso removido"} · {exam.questions.length} questões · {exam.attempts_count}{" "}
              {exam.attempts_count === 1 ? "tentativa" : "tentativas"}
            </p>
          </div>
        </button>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon-lg" onClick={() => setRenaming(true)} aria-label="Renomear prova">
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleting(true)}
            aria-label="Excluir prova"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t bg-muted/30 p-3 sm:p-5">
          {exam.questions.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Esta prova ainda não tem questões.</p>
          ) : (
            <ol className="grid gap-3">
              {exam.questions.map((question, index) => (
                <QuestionItem key={question.id} question={question} index={index} />
              ))}
            </ol>
          )}
          <Button variant="outline" className="mt-3 h-11 w-full border-dashed" onClick={() => setAdding(true)}>
            <Plus /> Adicionar questão
          </Button>
        </div>
      )}

      <RenameDialog open={renaming} onOpenChange={setRenaming} exam={exam} />
      <QuestionDialog open={adding} onOpenChange={setAdding} examId={exam.id} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Excluir "${exam.title}"?`}
        description={`As ${exam.questions.length} questões e as ${exam.attempts_count} tentativas dos alunos também serão apagadas. Não dá para desfazer.`}
        confirmLabel="Excluir prova"
        onConfirm={handleDelete}
      />
    </article>
  );
}

function QuestionItem({ question, index }: { question: AdminQuestion; index: number }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    try {
      await api(`/admin/questions/${question.id}`, { method: "DELETE" });
      toast.success("Questão excluída.");
      queryClient.invalidateQueries({ queryKey: keys.adminExams });
      queryClient.invalidateQueries({ queryKey: keys.courses });
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  }

  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
          {index + 1}
        </span>
        <p className="min-w-0 flex-1 pt-0.5 text-sm font-medium whitespace-pre-line">{question.text}</p>
        <div className="-mt-1 -mr-1 flex shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)} aria-label={`Editar questão ${index + 1}`}>
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleting(true)}
            aria-label={`Excluir questão ${index + 1}`}
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <ul className="mt-3 grid gap-1.5 pl-10">
        {question.options.map((option, i) => (
          <li
            key={option.id}
            className={cn(
              "flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-sm",
              option.is_correct ? "bg-success-soft font-medium text-success" : "text-muted-foreground",
            )}
          >
            <span className="font-bold">{LETTERS[i]})</span>
            <span className="flex-1">{option.text}</span>
            {option.is_correct && <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
          </li>
        ))}
      </ul>

      <QuestionDialog open={editing} onOpenChange={setEditing} question={question} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Excluir a questão ${index + 1}?`}
        description="A questão e as alternativas dela serão apagadas desta prova."
        confirmLabel="Excluir questão"
        onConfirm={handleDelete}
      />
    </li>
  );
}

function RenameDialog({ open, onOpenChange, exam }: { open: boolean; onOpenChange: (open: boolean) => void; exam: AdminExam }) {
  const [pending, setPending] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <RenameForm exam={exam} pending={pending} setPending={setPending} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({
  exam,
  pending,
  setPending,
  onDone,
}: {
  exam: AdminExam;
  pending: boolean;
  setPending: (pending: boolean) => void;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(exam.title);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);

    try {
      await api(`/admin/exams/${exam.id}`, { method: "PATCH", body: { title } });
      toast.success("Título atualizado.");
      queryClient.invalidateQueries({ queryKey: keys.adminExams });
      queryClient.invalidateQueries({ queryKey: keys.courses });
      setPending(false);
      onDone();
    } catch (error) {
      setPending(false);
      toast.error((error as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Título da prova</DialogTitle>
      </DialogHeader>
      <Field label="Título">
        {(id) => <Input id={id} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />}
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" className="h-10" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" className="h-10 px-5" disabled={pending || !title.trim()}>
          {pending && <Loader2 className="animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}
