"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, PartyPopper, RotateCcw, Target } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states";
import { useResult } from "@/lib/queries";
import { takeStashedResult } from "@/lib/exam-progress";
import { formatDateTime, formatScore } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ExamResult } from "@/lib/types";

export default function ResultPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-lg rounded-3xl" />}>
      <Result />
    </Suspense>
  );
}

function Result() {
  const id = Number(useSearchParams().get("id"));
  const { data, isPending, error, refetch } = useResult(id);
  const [stashed] = useState(() => takeStashedResult<ExamResult>(id));

  if (isPending) return <Skeleton className="mx-auto h-96 max-w-lg rounded-3xl" />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  // Acertos/total só vêm na resposta do envio; vale se for a mesma tentativa.
  const detail = stashed?.attempt.id === data.attempt.id ? stashed : null;
  const score = data.attempt.score;
  const approved = data.approved;

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/cursos/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Cursos
      </Link>

      <div className="overflow-hidden rounded-3xl border bg-card text-center">
        <div className={cn("px-6 pt-10 pb-8", approved ? "bg-success-soft" : "bg-muted/60")}>
          <ScoreRing score={score} approved={approved} />
          <div className="mt-5 flex items-center justify-center gap-2">
            {approved ? <PartyPopper className="size-6 text-success" /> : <Target className="size-6 text-muted-foreground" />}
            <h1 className="text-2xl font-bold">{approved ? "Aprovado!" : "Não foi dessa vez"}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{data.exam.title}</p>
        </div>

        <dl className="grid grid-cols-2 divide-x border-y text-center">
          {detail?.correct !== undefined ? (
            <Info label="Acertos" value={`${detail.correct} de ${detail.total}`} />
          ) : (
            <Info label="Feita em" value={formatDateTime(data.attempt.created_at)} />
          )}
          <Info label="Tentativas" value={`${data.attempts_count} de ${data.max_attempts}`} />
        </dl>

        <div className="grid gap-3 p-6">
          {!approved && (
            <p className="text-sm text-muted-foreground">
              {data.can_attempt
                ? "Você precisa de nota 5 para ser aprovado. Revise a apostila e tente de novo."
                : "Você usou todas as tentativas. Fale com a secretaria da Triunfo."}
            </p>
          )}
          {data.can_attempt && (
            <Link href={`/prova/?id=${data.exam.id}`} className={cn(buttonVariants(), "h-12 text-base")}>
              <RotateCcw /> Tentar de novo
            </Link>
          )}
          <Link
            href="/cursos/"
            className={cn(buttonVariants({ variant: data.can_attempt ? "outline" : "default" }), "h-12 text-base")}
          >
            Voltar aos cursos
          </Link>
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ score, approved }: { score: number; approved: boolean }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(1, score / 10));

  return (
    <div className="relative mx-auto size-40">
      <svg viewBox="0 0 128 128" className="size-full -rotate-90">
        <circle cx="64" cy="64" r={radius} fill="none" strokeWidth="10" className="stroke-black/5" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className={cn("transition-[stroke-dashoffset] duration-1000", approved ? "stroke-success" : "stroke-primary")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tabular-nums">{formatScore(score)}</span>
        <span className="text-xs text-muted-foreground">de 10</span>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-semibold">{value}</dd>
    </div>
  );
}
