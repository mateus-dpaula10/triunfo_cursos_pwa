"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireAdmin } from "@/components/guards";
import { OptionsEditor } from "@/components/question-editor";
import { Field, inputClass, selectClass } from "@/components/form";
import { ErrorState, PageHeader } from "@/components/states";
import { api, ApiError } from "@/lib/api";
import { keys, useCourses } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Draft = { key: number; text: string; options: string[]; correct: number | null };

let nextKey = 0;
const emptyQuestion = (): Draft => ({ key: nextKey++, text: "", options: ["", "", "", ""], correct: null });

const isComplete = (q: Draft) => q.text.trim() && q.options.every((o) => o.trim()) && q.correct !== null;

export default function NewExamPage() {
  return (
    <RequireAdmin>
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <NewExam />
      </Suspense>
    </RequireAdmin>
  );
}

function NewExam() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const preselected = useSearchParams().get("curso") ?? "";
  const { data: courses, isPending, error, refetch } = useCourses();
  const [courseId, setCourseId] = useState(preselected);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Draft[]>(() => [emptyQuestion()]);
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const lastAdded = useRef<number | null>(null);

  // Só cursos que ainda não têm prova (a API aceita uma prova por curso).
  const available = courses?.filter((c) => !c.exam) ?? [];
  // Se só sobra um curso sem prova, já vem escolhido.
  const selectedCourse = courseId || (available.length === 1 ? String(available[0].id) : "");

  useEffect(() => {
    if (lastAdded.current !== null) {
      document.getElementById(`question-${lastAdded.current}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      lastAdded.current = null;
    }
  }, [questions.length]);

  const updateQuestion = (key: number, patch: Partial<Draft>) =>
    setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)));

  function addQuestion() {
    const q = emptyQuestion();
    lastAdded.current = q.key;
    setQuestions((qs) => [...qs, q]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setServerError(null);

    if (!selectedCourse || !title.trim() || questions.length === 0 || !questions.every(isComplete)) {
      setShowErrors(true);
      const firstBad = questions.find((q) => !isComplete(q));
      if (selectedCourse && title.trim() && firstBad) {
        document.getElementById(`question-${firstBad.key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      toast.error("Confira os campos destacados.");
      return;
    }

    setPending(true);

    try {
      await api("/admin/exams", {
        method: "POST",
        body: {
          course_id: Number(selectedCourse),
          title,
          questions: questions.map((q) => ({ text: q.text, options: q.options, correct: q.correct })),
        },
      });
      toast.success("Prova cadastrada.");
      queryClient.invalidateQueries({ queryKey: keys.adminExams });
      queryClient.invalidateQueries({ queryKey: keys.courses });
      router.push("/provas/");
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Não foi possível salvar.");
      setPending(false);
    }
  }

  if (isPending) return <Skeleton className="h-96 rounded-2xl" />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const completeCount = questions.filter(isComplete).length;

  return (
    <form onSubmit={handleSubmit} noValidate className="pb-20 lg:pb-0">
      <Link href="/provas/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Provas
      </Link>
      <PageHeader title="Nova prova" description="Escolha o curso, dê um título e cadastre as questões." />

      {available.length === 0 ? (
        <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
          Todos os cursos já têm prova. Para mudar uma prova, edite-a na tela de{" "}
          <Link href="/provas/" className="font-medium text-primary hover:underline">Provas</Link>.
        </div>
      ) : (
        <>
          <div className="grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2 sm:p-6">
            <Field label="Curso" error={showErrors && !selectedCourse ? "Escolha o curso." : undefined}>
              {(id, invalid) => (
                <select id={id} className={selectClass} value={selectedCourse} onChange={(e) => setCourseId(e.target.value)} aria-invalid={invalid}>
                  <option value="" disabled>Selecione…</option>
                  {available.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Título da prova" error={showErrors && !title.trim() ? "Dê um título à prova." : undefined}>
              {(id, invalid) => (
                <Input id={id} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={invalid} />
              )}
            </Field>
          </div>

          <div className="mt-8 mb-3 flex items-end justify-between">
            <h2 className="text-lg font-bold">Questões</h2>
            <span className="text-sm text-muted-foreground">{completeCount} de {questions.length} prontas</span>
          </div>

          <div className="grid gap-4">
            {questions.map((q, index) => {
              const invalid = showErrors && !isComplete(q);
              return (
                <section
                  key={q.key}
                  id={`question-${q.key}`}
                  className={cn("grid gap-4 rounded-2xl border bg-card p-5 sm:p-6", invalid && "border-destructive/50 ring-2 ring-destructive/10")}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Questão {index + 1}</h3>
                    {questions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setQuestions((qs) => qs.filter((x) => x.key !== q.key))}
                      >
                        <Trash2 /> Remover
                      </Button>
                    )}
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Enunciado da questão"
                    value={q.text}
                    onChange={(e) => updateQuestion(q.key, { text: e.target.value })}
                    aria-invalid={invalid && !q.text.trim()}
                    aria-label={`Enunciado da questão ${index + 1}`}
                  />
                  <OptionsEditor
                    options={q.options}
                    correct={q.correct}
                    onChange={(options) => updateQuestion(q.key, { options })}
                    onCorrectChange={(i) => updateQuestion(q.key, { correct: i < 0 ? null : i })}
                    invalid={invalid}
                  />
                </section>
              );
            })}
          </div>

          <Button type="button" variant="outline" className="mt-4 h-12 w-full border-dashed" onClick={addQuestion}>
            <Plus /> Adicionar questão
          </Button>

          {serverError && (
            <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>
          )}

          {/* Barra de salvar fixa no celular */}
          <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 border-t bg-card/95 p-3 backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
            <Button type="submit" className="h-12 w-full text-base lg:w-auto lg:px-8" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Cadastrar prova ({questions.length} {questions.length === 1 ? "questão" : "questões"})
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
