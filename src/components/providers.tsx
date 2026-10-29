"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // Não insiste em 401/403/404: são respostas definitivas da API.
            retry: (count, error) =>
              !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
          },
        },
      }),
  );

  // O Safari do iPhone ignora user-scalable=no; bloqueia o gesto de pinça na mão.
  useEffect(() => {
    const block = (event: Event) => event.preventDefault();
    document.addEventListener("gesturestart", block);
    return () => document.removeEventListener("gesturestart", block);
  }, []);

  // Service worker só em produção, pra não cachear o dev server.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </AuthProvider>
      <Toaster theme="light" position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
}
