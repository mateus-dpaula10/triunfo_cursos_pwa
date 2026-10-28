"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CourseFormDialog } from "@/components/course-form-dialog";
import { EmptyState, ErrorState, PageHeader } from "@/components/states";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { keys, useCourses } from "@/lib/queries";
import { formatDateTime, formatScore, firstName, PASSING_SCORE } from "@/lib/format";
import { formatRemaining, readProgress } from "@/lib/exam-progress";
import { cn } from "@/lib/utils";
import type { Course } from "@/lib/types";

export default function CoursesPage() {
  const { user, isAdmin } = useAuth();
  const { data: courses, isPending, error, refetch } = useCourses();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title={isAdmin ? "Cursos" : `Olá, ${firstName(user!.name)}!`}
        description={isAdmin ? "Cadastre cursos, troque apostilas e acompanhe as provas." : "Aqui estão a apostila e a prova do seu curso."}
        action={
          isAdmin && (
            <Button className="h-10 px-4" onClick={() => setCreating(true)}>
              <Plus /> Novo curso
            </Button>
          )
        }
      />

      {isPending ? (
        <div className="grid gap-4">
          <Skeleton className="h-52 rounded-2xl" />
          {isAdmin && <Skeleton className="h-52 rounded-2xl" />}
        </div>
      ) : error ? (
        <ErrorState message={error.message} onRetry={refetch} />
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={isAdmin ? "Nenhum curso cadastrado" : "Você ainda não está em um curso"}
          description={
            isAdmin ? "Crie o primeiro curso para cadastrar a apostila e a prova." : "Fale com a secretaria da Triunfo para liberar o seu curso."
          }
          action={isAdmin && <Button onClick={() => setCreating(true)}><Plus /> Novo curso</Button>}
        />
      ) : (
        <div className="grid gap-4">
          {courses.map((course) =>
            isAdmin ? <AdminCourseCard key={course.id} course={course} /> : <StudentCourseCard key={course.id} course={course} />,
          )}
        </div>
      )}

      {isAdmin && <CourseFormDialog open={creating} onOpenChange={setCreating} />}
    </>
  );
}

function CourseInfo({ course }: { course: Course }) {
  return (
    <div className="flex gap-4">
      <div className="hidden size-12 shrink-0 items-center justify-center rounded-xl bg-secondary sm:flex">
        <BookOpen className="size-6 text-primary" />
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-bold">{course.title}</h2>
        {course.description && <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{course.description}</p>}
      </div>
    </div>
  );
}

function PdfButton({ url }: { url: string | null }) {
  if (!url) return <p className="text-sm text-muted-foreground">Apostila ainda não disponível.</p>;

  return (
    <a href={url} target="_blank" rel="noopener" className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}>
      <FileText /> Abrir apostila (PDF)
    </a>
  );
}

// ---------- Aluno ----------

function StudentCourseCard({ course }: { course: Course }) {
  const { user } = useAuth();
  const exam = course.exam;

  // Prova começada neste aparelho e ainda no prazo: oferece "Continuar".
  // (Só renderiza depois do login carregar, então já dá para ler o localStorage aqui.)
  const [inProgress] = useState(() => {
    const progress = exam ? readProgress(user!.id, exam.id) : null;
    return progress && progress.endsAt > Date.now() ? progress.endsAt - Date.now() : null;
  });

  const last = exam?.last_attempt;
  const approved = !!last && last.score >= PASSING_SCORE;

  return (
    <article className="overflow-hidden rounded-2xl border bg-card">
      <div className="grid gap-5 p-5 sm:p-6">
        <CourseInfo course={course} />
        <div>
          <PdfButton url={course.pdf_url} />
        </div>
      </div>

      <div className="border-t bg-muted/40 p-5 sm:p-6">
        {!exam ? (
          <p className="text-sm text-muted-foreground">A prova deste curso ainda não foi liberada.</p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Prova</p>
              <p className="font-semibold">{exam.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {approved ? (
                  <Badge className="bg-success-soft text-success">
                    <CheckCircle2 /> Aprovado · nota {formatScore(last.score)}
                  </Badge>
                ) : last ? (
                  <Badge variant="destructive">
                    <XCircle /> Última nota {formatScore(last.score)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">
                    {exam.questions_count} questões · 2 horas
                  </span>
                )}
                <span className="text-muted-foreground">
                  {exam.attempts_count} de {exam.max_attempts} tentativas
                </span>
              </div>
              {last && <p className="mt-1 text-xs text-muted-foreground">Feita em {formatDateTime(last.created_at)}</p>}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {last && (
                <Link href={`/resultado/?id=${exam.id}`} className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}>
                  Ver resultado
                </Link>
              )}
              {exam.can_attempt && (
                <Link href={`/prova/?id=${exam.id}`} className={cn(buttonVariants(), "h-11 px-5")}>
                  {inProgress ? (
                    <>
                      <Clock /> Continuar prova · {formatRemaining(inProgress)}
                    </>
                  ) : last ? (
                    <>
                      <RotateCcw /> Tentar de novo
                    </>
                  ) : (
                    "Fazer prova"
                  )}
                </Link>
              )}
              {!exam.can_attempt && !approved && (
                <p className="text-sm text-muted-foreground sm:max-w-48">
                  Tentativas esgotadas. Fale com a secretaria se precisar refazer.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// ---------- Admin ----------

function AdminCourseCard({ course }: { course: Course }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const exam = course.exam;

  async function handleDelete() {
    try {
      await api(`/admin/courses/${course.id}`, { method: "DELETE" });
      toast.success("Curso excluído.");
      queryClient.invalidateQueries({ queryKey: keys.courses });
      queryClient.invalidateQueries({ queryKey: keys.adminExams });
    } catch (error) {
      toast.error((error as Error).message);
      throw error;
    }
  }

  return (
    <article className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <CourseInfo course={course} />
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon-lg" onClick={() => setEditing(true)} aria-label="Editar curso">
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleting(true)}
            aria-label="Excluir curso"
          >
            <Trash2 />
          </Button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PdfButton url={course.pdf_url} />
        {exam ? (
          <Link href="/provas/" className="text-sm font-medium text-primary hover:underline">
            Prova: {exam.title} · {exam.questions_count} questões →
          </Link>
        ) : (
          <Link href={`/provas/nova/?curso=${course.id}`} className="text-sm font-medium text-primary hover:underline">
            + Criar a prova deste curso
          </Link>
        )}
      </div>

      <CourseFormDialog open={editing} onOpenChange={setEditing} course={course} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Excluir "${course.title}"?`}
        description="A apostila, a prova, as questões e todas as tentativas dos alunos neste curso também serão apagadas. Não dá para desfazer."
        confirmLabel="Excluir curso"
        onConfirm={handleDelete}
      />
    </article>
  );
}
