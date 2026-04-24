import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCancelRegistration } from './useCancelRegistration'
import { apiFetch } from '../lib/api'

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@clerk/clerk-react'

const mockApiFetch = vi.mocked(apiFetch)
const mockUseAuth = vi.mocked(useAuth)

let queryClient: QueryClient

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useCancelRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  it('sends DELETE to /registrations/:id with auth token', async () => {
    mockUseAuth.mockReturnValue({ getToken: vi.fn().mockResolvedValue('token_123') } as never)
    mockApiFetch.mockResolvedValue(undefined)

    const { result } = renderHook(() => useCancelRegistration(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ registrationId: 'reg_1', classId: 'cls_1' })
    })

    expect(mockApiFetch).toHaveBeenCalledWith('/registrations/reg_1', 'token_123', {
      method: 'DELETE',
    })
  })

  it('invalidates my-registrations and classes queries on success', async () => {
    mockUseAuth.mockReturnValue({ getToken: vi.fn().mockResolvedValue('token_123') } as never)
    mockApiFetch.mockResolvedValue(undefined)

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined)

    const { result } = renderHook(() => useCancelRegistration(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ registrationId: 'reg_1', classId: 'cls_1' })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['my-registrations'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['classes'] })
  })
})
