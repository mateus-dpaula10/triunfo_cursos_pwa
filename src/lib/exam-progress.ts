// Prova em andamento fica salva no aparelho (respostas + hora de término), como no
// sistema web: fechar o app ou cair a internet não perde nada, e o cronômetro continua.

export type ExamProgress = {
  endsAt: number;
  answers: Record<number, number>; // questionId -> optionId
  current: number;
};

const key = (userId: number, examId: number) => `triunfo.exam.${userId}.${examId}`;

export function readProgress(userId: number, examId: number): ExamProgress | null {
  try {
    const raw = localStorage.getItem(key(userId, examId));
    return raw ? (JSON.parse(raw) as ExamProgress) : null;
  } catch {
    return null;
  }
}

export function saveProgress(userId: number, examId: number, progress: ExamProgress) {
  try {
    localStorage.setItem(key(userId, examId), JSON.stringify(progress));
  } catch {}
}

export function clearProgress(userId: number, examId: number) {
  try {
    localStorage.removeItem(key(userId, examId));
  } catch {}
}

export function formatRemaining(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// Resultado recém-enviado (traz acertos/total, que o GET /result não devolve).
const resultKey = (examId: number) => `triunfo.result.${examId}`;

export function stashResult(examId: number, data: unknown) {
  try {
    sessionStorage.setItem(resultKey(examId), JSON.stringify(data));
  } catch {}
}

export function takeStashedResult<T>(examId: number): T | null {
  try {
    const raw = sessionStorage.getItem(resultKey(examId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
