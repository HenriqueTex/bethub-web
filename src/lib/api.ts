const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
const TOKEN_KEY = "bethub_token"

export interface User {
  id: number
  fullName: string | null
  email: string
  createdAt: string
  updatedAt: string | null
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
    message: string
  ) {
    super(message)
  }
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
    let message = "Algo deu errado. Tente novamente."
    try {
      const body = await response.json()
      message = body?.errors?.[0]?.message ?? body?.message ?? message
    } catch {}
    throw new ApiError(response.status, message)
  }

  if (response.status === 204) {
    return undefined as T
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

export async function register(fullName: string, email: string, password: string) {
  const data = await apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ fullName, email, password }),
  })
  setToken(data.token.value)
  return data.user
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
