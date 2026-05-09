const API_URL = process.env['EXPO_PUBLIC_API_URL']
if (!API_URL) {
  throw new Error('Missing EXPO_PUBLIC_API_URL — set it in apps/mobile/.env')
}

export async function apiFetch<T>(
  path: string,
  token?: string | null,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  })
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try {
      const body = await response.json() as { error?: { message?: string } }
      if (body.error?.message) {
        message = body.error.message
      }
    } catch {
      // body is not JSON — keep the status text message
    }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}
