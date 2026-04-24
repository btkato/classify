import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMyRegistrations } from './useMyRegistrations'
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

const mockRegistrations = [
  {
    id: 'reg_1',
    classId: 'cls_1',
    userId: 'user_1',
    membershipId: null,
    status: 'ENROLLED',
    waitlistPosition: null,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
    class: {
      id: 'cls_1',
      title: 'Morning Yoga',
      startsAt: '2026-05-01T09:00:00.000Z',
      durationMinutes: 60,
      location: null,
      status: 'ACTIVE',
    },
  },
]

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useMyRegistrations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches registrations when signed in', async () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      getToken: vi.fn().mockResolvedValue('token_123'),
    } as never)
    mockApiFetch.mockResolvedValue(mockRegistrations)

    const { result } = renderHook(() => useMyRegistrations(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(mockRegistrations))
    expect(mockApiFetch).toHaveBeenCalledWith('/registrations', 'token_123')
  })

  it('does not fetch when not signed in', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, getToken: vi.fn() } as never)

    const { result } = renderHook(() => useMyRegistrations(), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})
