// Cliente da API Laravel. O token Sanctum fica no localStorage e vai em
// "Authorization: Bearer <token>" em todas as chamadas.

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api").replace(/\/$/, "");

const TOKEN_KEY = "triunfo.token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message);
    this.status = status;
    this.errors = errors;
  }

  // Primeira mensagem de um campo (erros 422 do Laravel)
  field(name: string) {
    return this.errors[name]?.[0];
  }
}

// Avisado pelo AuthProvider quando o token expira ou é revogado.
let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
};

export async function api<T>(path: string, { method = "GET", body, query }: Options = {}): Promise<T> {
  const url = new URL(API_URL + path);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getToken();

  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;

  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetch(url, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, "Sem conexão com o servidor. Verifique sua internet e tente de novo.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized?.();

    const errors = (data?.errors ?? {}) as Record<string, string[]>;
    const first = Object.values(errors)[0]?.[0];
    const message =
      first ??
      data?.message ??
      (response.status === 429
        ? "Muitas tentativas. Aguarde um minuto e tente de novo."
        : "Algo deu errado. Tente de novo.");

    throw new ApiError(response.status, message, errors);
  }

  return data as T;
}
