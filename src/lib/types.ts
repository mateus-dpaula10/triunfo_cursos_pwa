// Formatos devolvidos pela API Laravel (app/Http/Controllers/Api).

export type Role = "user" | "admin";

export type User = {
  id: number;
  name: string;
  cpf: string;
  birth_date: string | null;
  phone: string | null;
  role: Role;
  description: string | null;
  course_id: number | null;
};

export type LastAttempt = {
  score: number;
  created_at: string;
};

export type CourseExam = {
  id: number;
  title: string;
  questions_count: number;
  attempts_count: number;
  max_attempts: number;
  last_attempt: LastAttempt | null;
  can_attempt: boolean;
};

export type Course = {
  id: number;
  title: string;
  description: string | null;
  pdf_url: string | null;
  exam: CourseExam | null;
};

export type ExamOption = { id: number; text: string };

export type ExamQuestion = {
  id: number;
  text: string;
  options: ExamOption[];
};

export type Exam = {
  id: number;
  title: string;
  course_id: number;
  attempts_count: number;
  max_attempts: number;
  duration_minutes: number;
  questions: ExamQuestion[];
};

export type ExamResult = {
  exam: { id: number; title: string; course_id: number };
  attempt: { id: number; score: number; created_at: string };
  approved: boolean;
  attempts_count: number;
  max_attempts: number;
  can_attempt: boolean;
  correct?: number;
  total?: number;
};

export type AdminOption = { id: number; text: string; is_correct: boolean };

export type AdminQuestion = {
  id: number;
  text: string;
  options: AdminOption[];
};

export type AdminExam = {
  id: number;
  title: string;
  course_id: number;
  course_title: string | null;
  attempts_count: number;
  questions: AdminQuestion[];
};

export type AdminUser = User & {
  course_title: string | null;
  last_attempt: {
    exam_title: string | null;
    score: number;
    created_at: string;
    attempts_count: number;
  } | null;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};
