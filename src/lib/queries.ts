"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AdminExam, AdminUser, Course, Exam, ExamResult, Paginated } from "@/lib/types";

export const keys = {
  courses: ["courses"] as const,
  exam: (id: number) => ["exam", id] as const,
  result: (id: number) => ["result", id] as const,
  adminExams: ["admin", "exams"] as const,
  users: (search: string, page: number) => ["admin", "users", search, page] as const,
  allUsers: ["admin", "users"] as const,
};

export const useCourses = () => useQuery({ queryKey: keys.courses, queryFn: () => api<Course[]>("/courses") });

export const useExam = (id: number) =>
  useQuery({
    queryKey: keys.exam(id),
    queryFn: () => api<Exam>(`/exams/${id}`),
    enabled: id > 0,
    staleTime: Infinity,
  });

export const useResult = (id: number) =>
  useQuery({ queryKey: keys.result(id), queryFn: () => api<ExamResult>(`/exams/${id}/result`), enabled: id > 0 });

export const useAdminExams = () =>
  useQuery({ queryKey: keys.adminExams, queryFn: () => api<AdminExam[]>("/admin/exams") });

export const useUsers = (search: string, page: number) =>
  useQuery({
    queryKey: keys.users(search, page),
    queryFn: () => api<Paginated<AdminUser>>("/admin/users", { query: { search, page } }),
    placeholderData: (previous) => previous,
  });
