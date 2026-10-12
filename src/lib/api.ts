const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
const TOKEN_KEY = "bethub_token"

export interface User {
  id: number
  fullName: string | null
  email: string
  status: "pending" | "approved" | "active" | "rejected"
  createdAt: string
  updatedAt: string | null
}

export interface PendingApproval {
  user: { fullName: string | null; email: string; createdAt: string }
  expiresAt: string
}

interface AuthResponse {
  user: User
  token: {
    type: "bearer"
    value: string
    expiresAt: string | null
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message)
  }
}

async function toApiError(response: Response) {
  let message = "Algo deu errado. Tente novamente."
  let code: string | undefined
  try {
    const body = await response.json()
    message = body?.errors?.[0]?.message ?? body?.message ?? message
    code = body?.errors?.[0]?.code
  } catch {}
  return new ApiError(response.status, message, code)
}

export function getToken() {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw await toApiError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }
  return response.json()
}

export async function apiUpload<T>(path: string, formData: FormData, signal?: AbortSignal): Promise<T> {
  const token = getToken()
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
    signal,
  })

  if (!response.ok) {
    throw await toApiError(response)
  }

  return response.json()
}

export async function login(email: string, password: string) {
  const data = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  setToken(data.token.value)
  return data.user
}

export async function devLogin() {
  const data = await apiFetch<AuthResponse>("/auth/dev-login", { method: "POST" })
  setToken(data.token.value)
  return data.user
}

/** O cadastro entra na fila de aprovação; não há sessão até a ativação. */
export async function register(fullName: string, email: string, password: string) {
  return apiFetch<{ status: "pending"; message: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ fullName, email, password }),
  })
}

export async function activateAccount(token: string) {
  const data = await apiFetch<AuthResponse>("/auth/activate", {
    method: "POST",
    body: JSON.stringify({ token }),
  })
  setToken(data.token.value)
  return data.user
}

export async function resendActivation(email: string) {
  return apiFetch<{ message: string }>("/auth/activation/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export async function getPendingApproval(token: string) {
  return apiFetch<PendingApproval>(`/auth/approvals?token=${encodeURIComponent(token)}`)
}

export async function decideApproval(token: string, decision: "approve" | "reject") {
  return apiFetch<{ status: User["status"]; email: string }>(`/auth/approvals/${decision}`, {
    method: "POST",
    body: JSON.stringify({ token }),
  })
}

export async function me() {
  const data = await apiFetch<{ user: User }>("/auth/me")
  return data.user
}

export async function logout() {
  try {
    await apiFetch<void>("/auth/logout", { method: "DELETE" })
  } finally {
    clearToken()
  }
}
