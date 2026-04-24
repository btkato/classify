import { renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEnroll } from './useEnroll'
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

describe('useEnroll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
  })

  it('posts to /registrations with the class ID and auth token', async () => {
    mockUseAuth.mockReturnValue({ getToken: vi.fn().mockResolvedValue('token_123') } as never)
    mockApiFetch.mockResolvedValue({ id: 'reg_1', status: 'ENROLLED' })

    const { result } = renderHook(() => useEnroll('cls_1'), { wrapper })

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(mockApiFetch).toHaveBeenCalledWith('/registrations', 'token_123', {
      method: 'POST',
      body: JSON.stringify({ classId: 'cls_1' }),
    })
  })

  it('invalidates my-registrations and classes queries on success', async () => {
    mockUseAuth.mockReturnValue({ getToken: vi.fn().mockResolvedValue('token_123') } as never)
    mockApiFetch.mockResolvedValue({ id: 'reg_1', status: 'ENROLLED' })

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined)

    const { result } = renderHook(() => useEnroll('cls_1'), { wrapper })

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['my-registrations'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['classes'] })
  })
})
