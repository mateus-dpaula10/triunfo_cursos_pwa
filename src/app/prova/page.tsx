"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Clock,
  Grid3x3,
  Loader2,
  Save,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RequireAuth } from "@/components/guards";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorState, FullScreenLoader } from "@/components/states";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { keys, useExam } from "@/lib/queries";
import {
  clearProgress,
  formatRemaining,
  readProgress,
  saveProgress,
  stashResult,
  type ExamProgress,
} from "@/lib/exam-progress";
import { cn } from "@/lib/utils";
import type { Exam, ExamResult } from "@/lib/types";

const LETTERS = "ABCDEF";

export default function ExamPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<FullScreenLoader />}>
        <ExamLoader />
      </Suspense>
    </RequireAuth>
  );
}

function ExamLoader() {
  const id = Number(useSearchParams().get("id"));
  const { data: exam, isPending, error, refetch } = useExam(id);

  if (!id) return <Blocked message="Prova não encontrada." />;
  if (isPending) return <FullScreenLoader />;
  if (error) {
    return error instanceof ApiError && error.status !== 0 ? (
      <Blocked message={error.status === 404 ? "Prova não encontrada." : error.message} />
    ) : (
      <div className="mx-auto max-w-md px-4 py-16">
        <ErrorState message={error.message} onRetry={refetch} />
      </div>
    );
  }

  return <ExamRunner exam={exam} />;
}

function Blocked({ message }: { message: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-secondary">
          <ClipboardCheck className="size-7 text-primary" />
        </div>
        <p className="font-semibold">{message}</p>
        <Link href="/cursos/" className={cn(buttonVariants(), "mt-6 h-11 w-full")}>
          Voltar aos cursos
        </Link>
      </div>
    </div>
  );
}

type Phase = "intro" | "running" | "submitting";

function ExamRunner({ exam }: { exam: Exam }) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = user!.id;
  const total = exam.questions.length;

  // Prova começada neste aparelho continua de onde parou. Se o tempo acabou com o app
  // fechado, abre já em "tempo esgotado" e o cronômetro envia no primeiro tique.
  const [saved] = useState(() => readProgress(userId, exam.id));
  const [phase, setPhase] = useState<Phase>(saved ? "running" : "intro");
  const [progress, setProgress] = useState<ExamProgress | null>(saved);
  const [now, setNow] = useState(() => Date.now());
  const [mapOpen, setMapOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [timeUp, setTimeUp] = useState(() => !!saved && saved.endsAt <= Date.now());
  const warned = useRef<{ ten?: boolean; one?: boolean; ended?: boolean }>({});
  const answersRef = useRef<Record<number, number>>(saved?.answers ?? {});
  const submittingRef = useRef(false);
  const submitRef = useRef<(answers: Record<number, number>) => void>(() => {});

  function update(patch: Partial<ExamProgress>) {
    if (!progress) return;
    const next = { ...progress, ...patch };
    saveProgress(userId, exam.id, next);
    answersRef.current = next.answers;
    setProgress(next);
  }

  const submit = useCallback(
    async (answers: Record<number, number>) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setPhase("submitting");

      try {
        const result = await api<ExamResult>(`/exams/${exam.id}/submit`, { method: "POST", body: { answers } });
        clearProgress(userId, exam.id);
        stashResult(exam.id, result);
        queryClient.setQueryData(keys.result(exam.id), result);
        queryClient.invalidateQueries({ queryKey: keys.courses });
        queryClient.removeQueries({ queryKey: keys.exam(exam.id) });
        router.replace(`/resultado/?id=${exam.id}`);
      } catch (error) {
        submittingRef.current = false;
        setPhase("running");

        if (error instanceof ApiError && error.status === 403) {
          clearProgress(userId, exam.id);
          toast.error(error.message);
          router.replace("/cursos/");
        } else {
          toast.error("Não foi possível enviar. Suas respostas continuam salvas neste aparelho.", {
            description: (error as Error).message,
            action: { label: "Tentar de novo", onClick: () => submitRef.current(answers) },
            duration: 15000,
          });
        }
      }
    },
    [exam.id, userId, queryClient, router],
  );

  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  // Cronômetro
  const endsAt = progress?.endsAt;

  useEffect(() => {
    if (phase !== "running" || !endsAt) return;

    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      const remaining = endsAt - current;

      if (remaining <= 0) {
        // Uma vez só: se falhar (sem internet), a tela trava com o botão de reenviar.
        if (!warned.current.ended) {
          warned.current.ended = true;
          setTimeUp(true);
          submit(answersRef.current);
        }
      } else if (remaining <= 60_000 && !warned.current.one) {
        warned.current.one = warned.current.ten = true;
        toast.warning("Falta 1 minuto! A prova será enviada automaticamente.");
      } else if (remaining <= 600_000 && !warned.current.ten) {
        warned.current.ten = true;
        toast.warning("Faltam 10 minutos para acabar o tempo.");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, endsAt, submit]);

  function start() {
    const fresh: ExamProgress = { endsAt: Date.now() + exam.duration_minutes * 60_000, answers: {}, current: 0 };
    saveProgress(userId, exam.id, fresh);
    answersRef.current = {};
    setProgress(fresh);
    setNow(Date.now());
    setPhase("running");
  }

  if (phase === "intro") {
    return <Intro exam={exam} onStart={start} />;
  }

  if (!progress) return <FullScreenLoader />;

  const remaining = progress.endsAt - now;
  const answeredCount = Object.keys(progress.answers).length;
  const index = Math.min(progress.current, total - 1);
  const question = exam.questions[index];
  const isLast = index === total - 1;
  const lowTime = remaining <= 600_000;

  const goTo = (i: number) => {
    update({ current: Math.max(0, Math.min(total - 1, i)) });
    window.scrollTo({ top: 0 });
  };

  const choose = (optionId: number) => update({ answers: { ...progress.answers, [question.id]: optionId } });

  return (
    <div className="min-h-dvh pb-28 lg:pb-10">
      {/* Topo fixo: sair, título, cronômetro e progresso */}
      <header className="pt-safe sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon-lg" onClick={() => setExitOpen(true)} aria-label="Sair da prova">
            <X />
          </Button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{exam.title}</p>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums",
              lowTime ? "animate-pulse bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground",
            )}
            aria-label="Tempo restante"
          >
            <Clock className="size-4" />
            {formatRemaining(remaining)}
          </div>
        </div>
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${(answeredCount / total) * 100}%` }} />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 lg:grid-cols-[1fr_300px] lg:pt-8">
        {/* Questão */}
        <section key={question.id} className="animate-in fade-in-0 slide-in-from-right-2 duration-200">
          <p className="text-sm font-semibold text-primary">
            Questão {index + 1} <span className="text-muted-foreground">de {total}</span>
          </p>
          <h1 className="mt-2 text-lg leading-relaxed font-semibold whitespace-pre-line sm:text-xl">{question.text}</h1>

          <div className="mt-6 grid gap-3" role="radiogroup" aria-label={`Alternativas da questão ${index + 1}`}>
            {question.options.map((option, i) => {
              const selected = progress.answers[question.id] === option.id;
              return (
                <button
                  key={option.id}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => choose(option.id)}
                  className={cn(
                    "flex items-start gap-4 rounded-2xl border-2 bg-card p-4 text-left transition-all active:scale-[0.99]",
                    selected ? "border-primary bg-secondary/60 shadow-sm" : "border-transparent ring-1 ring-border hover:ring-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                      selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {selected ? <Check className="size-4" /> : LETTERS[i]}
                  </span>
                  <span className="pt-1 text-[15px] leading-relaxed">{option.text}</span>
                </button>
              );
            })}
          </div>

          {/* Navegação (desktop) */}
          <div className="mt-8 hidden items-center justify-between lg:flex">
            <Button variant="outline" className="h-11 px-4" onClick={() => goTo(index - 1)} disabled={index === 0}>
              <ArrowLeft /> Anterior
            </Button>
            {isLast ? (
              <Button className="h-11 px-5" onClick={() => setReviewOpen(true)}>
                Revisar e enviar <Send />
              </Button>
            ) : (
              <Button className="h-11 px-5" onClick={() => goTo(index + 1)}>
                Próxima <ArrowRight />
              </Button>
            )}
          </div>
        </section>

        {/* Mapa de questões (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border bg-card p-5">
            <QuestionMap exam={exam} progress={progress} current={index} onSelect={goTo} />
            <Button className="mt-5 h-11 w-full" variant="outline" onClick={() => setReviewOpen(true)}>
              <Send /> Enviar prova
            </Button>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Save className="size-3.5" /> Respostas salvas neste aparelho
            </p>
          </div>
        </aside>
      </div>

      {/* Navegação (celular) */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-2 p-3">
          <Button variant="outline" size="icon-lg" className="size-12" onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Questão anterior">
            <ArrowLeft />
          </Button>
          <Button variant="secondary" className="h-12 flex-1 gap-2" onClick={() => setMapOpen(true)}>
            <Grid3x3 /> {answeredCount}/{total} respondidas
          </Button>
          {isLast ? (
            <Button className="h-12 px-4" onClick={() => setReviewOpen(true)}>
              Enviar <Send />
            </Button>
          ) : (
            <Button size="icon-lg" className="size-12" onClick={() => goTo(index + 1)} aria-label="Próxima questão">
              <ArrowRight />
            </Button>
          )}
        </div>
      </nav>

      <Sheet open={mapOpen} onOpenChange={setMapOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
          <SheetHeader>
            <SheetTitle>Questões</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            <QuestionMap
              exam={exam}
              progress={progress}
              current={index}
              onSelect={(i) => {
                goTo(i);
                setMapOpen(false);
              }}
            />
            <Button
              className="mt-5 h-12 w-full"
              onClick={() => {
                setMapOpen(false);
                setReviewOpen(true);
              }}
            >
              <Send /> Revisar e enviar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        exam={exam}
        progress={progress}
        onGoTo={(i) => {
          setReviewOpen(false);
          goTo(i);
        }}
        onSubmit={() => {
          setReviewOpen(false);
          submit(progress.answers);
        }}
      />

      <ConfirmDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        title="Sair da prova?"
        description="Suas respostas ficam salvas neste aparelho, mas o tempo continua contando. Quando o tempo acabar, a prova é enviada como estiver."
        confirmLabel="Sair"
        destructive={false}
        onConfirm={async () => router.push("/cursos/")}
      />

      {phase === "submitting" ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-sm">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="font-semibold">{timeUp ? "Tempo esgotado! Enviando suas respostas…" : "Enviando suas respostas…"}</p>
        </div>
      ) : (
        timeUp && (
          // Tempo acabou e o envio falhou: não deixa mais responder, só reenviar.
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center">
              <Clock className="mx-auto size-10 text-destructive" />
              <p className="mt-3 text-lg font-bold">Tempo esgotado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Suas respostas estão salvas neste aparelho. Se o envio não acontecer sozinho, confira a internet e toque abaixo.
              </p>
              <Button className="mt-5 h-12 w-full" onClick={() => submit(progress.answers)}>
                <Send /> Enviar respostas
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function Intro({ exam, onStart }: { exam: Exam; onStart: () => void }) {
  const attempt = exam.attempts_count + 1;
  const hours = exam.duration_minutes / 60;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <Link href="/cursos/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <div className="overflow-hidden rounded-3xl border bg-card">
          <div className="bg-primary px-6 py-8 text-primary-foreground">
            <p className="text-sm font-medium text-white/80">Prova</p>
            <h1 className="mt-1 text-2xl font-bold">{exam.title}</h1>
          </div>
          <div className="grid grid-cols-3 divide-x border-b text-center">
            <Stat value={exam.questions.length} label="questões" />
            <Stat value={Number.isInteger(hours) ? `${hours}h` : `${exam.duration_minutes} min`} label="de duração" />
            <Stat value={`${attempt}ª`} label={`de ${exam.max_attempts} tentativas`} />
          </div>
          <ul className="grid gap-3 p-6 text-sm">
            <Rule icon={Clock}>O cronômetro começa quando você tocar em <b>Começar</b> e não para, mesmo se fechar o app.</Rule>
            <Rule icon={Save}>Suas respostas ficam salvas neste aparelho. Se sair, é só voltar e continuar.</Rule>
            <Rule icon={Send}>Quando o tempo acabar, a prova é enviada automaticamente.</Rule>
            <Rule icon={ShieldCheck}>Para ser aprovado, você precisa de nota <b>5</b> ou mais (de 0 a 10).</Rule>
          </ul>
          <div className="px-6 pb-6">
            <Button className="h-12 w-full text-base" onClick={onStart}>
              Começar prova <ArrowRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="px-2 py-4">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Rule({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <span className="text-muted-foreground [&_b]:text-foreground">{children}</span>
    </li>
  );
}

function QuestionMap({
  exam,
  progress,
  current,
  onSelect,
}: {
  exam: Exam;
  progress: ExamProgress;
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5">
        {exam.questions.map((q, i) => {
          const answered = progress.answers[q.id] !== undefined;
          return (
            <button
              key={q.id}
              onClick={() => onSelect(i)}
              aria-label={`Questão ${i + 1}${answered ? ", respondida" : ""}`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                answered ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-secondary",
                i === current && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-primary" /> Respondida</span>
        <span className="flex items-center gap-1.5"><span className="size-3 rounded bg-muted ring-1 ring-border" /> Em branco</span>
      </div>
    </>
  );
}

function ReviewDialog({
  open,
  onOpenChange,
  exam,
  progress,
  onGoTo,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: Exam;
  progress: ExamProgress;
  onGoTo: (index: number) => void;
  onSubmit: () => void;
}) {
  const blank = useMemo(
    () => exam.questions.map((q, i) => (progress.answers[q.id] === undefined ? i : -1)).filter((i) => i >= 0),
    [exam, progress.answers],
  );
  const total = exam.questions.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar a prova?</DialogTitle>
          <DialogDescription>
            Você respondeu <b className="text-foreground">{total - blank.length} de {total}</b> questões. Depois de enviar, não dá
            para mudar as respostas.
          </DialogDescription>
        </DialogHeader>

        {blank.length > 0 && (
          <div className="rounded-xl bg-destructive/5 p-3 ring-1 ring-destructive/20">
            <p className="text-sm font-medium text-destructive">
              {blank.length === 1 ? "1 questão em branco" : `${blank.length} questões em branco`} (conta como erro):
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {blank.map((i) => (
                <button
                  key={i}
                  onClick={() => onGoTo(i)}
                  className="flex size-9 items-center justify-center rounded-lg bg-card text-sm font-semibold ring-1 ring-border hover:ring-primary"
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="h-10" onClick={() => onOpenChange(false)}>
            Continuar respondendo
          </Button>
          <Button className="h-10 px-5" onClick={onSubmit}>
            <Send /> Enviar respostas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
