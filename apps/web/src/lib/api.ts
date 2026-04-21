import { z } from 'zod'

const errorBodySchema = z.object({
  error: z.union([z.string(), z.object({ message: z.string() })]).optional(),
})

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function apiFetch<T>(
  path: string,
  token?: string,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const raw = await res.json().catch(() => ({}))
    const parsed = errorBodySchema.safeParse(raw)
    const errorValue = parsed.success ? parsed.data.error : undefined
    const message = typeof errorValue === 'string' ? errorValue : errorValue?.message
    throw new Error(message ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

export { apiFetch }
