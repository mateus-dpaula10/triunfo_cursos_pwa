"use client";

import { useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { AdminQuestion } from "@/lib/types";

export const LETTERS = "ABCDEF";
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;

// Lista de alternativas com a correta marcada. Usada na nova prova e no diálogo de questão.
export function OptionsEditor({
  options,
  correct,
  onChange,
  onCorrectChange,
  canResize = true,
  invalid,
}: {
  options: string[];
  correct: number | null;
  onChange: (options: string[]) => void;
  onCorrectChange: (index: number) => void;
  canResize?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>Alternativas</Label>
        <span className={cn("text-xs", invalid && correct === null ? "font-medium text-destructive" : "text-muted-foreground")}>
          Toque na letra para marcar a correta
        </span>
      </div>

      {options.map((text, i) => {
        const isCorrect = correct === i;
        return (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCorrectChange(i)}
              aria-label={`Marcar alternativa ${LETTERS[i]} como correta`}
              aria-pressed={isCorrect}
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors",
                isCorrect ? "bg-success text-white" : "bg-muted text-muted-foreground hover:bg-success-soft hover:text-success",
              )}
            >
              {isCorrect ? <Check className="size-4" /> : LETTERS[i]}
            </button>
            <Input
              value={text}
              onChange={(e) => onChange(options.map((o, j) => (j === i ? e.target.value : o)))}
              placeholder={`Alternativa ${LETTERS[i]}`}
              className={cn("h-11 text-base md:text-sm", isCorrect && "border-success/50")}
              aria-invalid={invalid && !text.trim()}
            />
            {canResize && options.length > MIN_OPTIONS && (
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={() => {
                  onChange(options.filter((_, j) => j !== i));
                  if (correct !== null) onCorrectChange(correct === i ? -1 : correct > i ? correct - 1 : correct);
                }}
                aria-label={`Remover alternativa ${LETTERS[i]}`}
              >
                <X />
              </Button>
            )}
          </div>
        );
      })}

      {canResize && options.length < MAX_OPTIONS && (
        <Button type="button" variant="ghost" className="justify-start text-primary" onClick={() => onChange([...options, ""])}>
          <Plus /> Adicionar alternativa
        </Button>
      )}
    </div>
  );
}

// Criar questão numa prova (examId) ou editar uma existente (question).
// Na edição a API só atualiza as alternativas que já existem, então não dá para somar/remover.
export function QuestionDialog({
  open,
  onOpenChange,
  examId,
  question,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId?: number;
  question?: AdminQuestion;
}) {
  const [pending, setPending] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        {/* Montado a cada abertura: começa com os dados atuais da questão. */}
        <QuestionForm
          examId={examId}
          question={question}
          pending={pending}
          setPending={setPending}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function QuestionForm({
  examId,
  question,
  pending,
  setPending,
  onDone,
}: {
  examId?: number;
  question?: AdminQuestion;
  pending: boolean;
  setPending: (pending: boolean) => void;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState(question?.text ?? "");
  const [options, setOptions] = useState<string[]>(() => (question ? question.options.map((o) => o.text) : ["", "", "", ""]));
  const [correct, setCorrect] = useState<number | null>(() => {
    const index = question?.options.findIndex((o) => o.is_correct) ?? -1;
    return index >= 0 ? index : null;
  });
  const [invalid, setInvalid] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!text.trim() || options.some((o) => !o.trim()) || correct === null) {
      setInvalid(true);
      return;
    }

    setPending(true);

    try {
      if (question) {
        await api(`/admin/questions/${question.id}`, {
          method: "PATCH",
          body: {
            text,
            options: question.options.map((o, i) => ({ id: o.id, text: options[i] })),
            correct_option_id: question.options[correct].id,
          },
        });
      } else {
        await api(`/admin/exams/${examId}/questions`, { method: "POST", body: { text, options, correct } });
      }

      toast.success(question ? "Questão atualizada." : "Questão adicionada.");
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
        <DialogTitle>{question ? "Editar questão" : "Nova questão"}</DialogTitle>
        <DialogDescription>Escreva o enunciado, as alternativas e marque a correta.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-1.5">
        <Label htmlFor="question-text">Enunciado</Label>
        <Textarea
          id="question-text"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={invalid && !text.trim()}
        />
      </div>

      <OptionsEditor
        options={options}
        correct={correct}
        onChange={setOptions}
        onCorrectChange={(i) => setCorrect(i < 0 ? null : i)}
        canResize={!question}
        invalid={invalid}
      />

      {invalid && <p className="text-sm font-medium text-destructive">Preencha o enunciado, todas as alternativas e marque a correta.</p>}

      <DialogFooter>
        <Button type="button" variant="outline" className="h-10" onClick={onDone} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" className="h-10 px-5" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {question ? "Salvar" : "Adicionar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
