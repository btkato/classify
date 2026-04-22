import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRoster } from './useRoster'
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

const mockRoster = [
  {
    id: 'reg_1',
    status: 'ENROLLED',
    waitlistPosition: null,
    user: { id: 'user_2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
  },
  {
    id: 'reg_2',
    status: 'WAITLISTED',
    waitlistPosition: 1,
    user: { id: 'user_3', firstName: 'John', lastName: 'Smith', email: 'john@example.com' },
  },
]

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useRoster', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      getToken: vi.fn().mockResolvedValue('token_123'),
    } as never)
  })

  it('fetches the roster for the given class id', async () => {
    mockApiFetch.mockResolvedValue(mockRoster)

    const { result } = renderHook(() => useRoster('class_1'), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(mockRoster))
    expect(mockApiFetch).toHaveBeenCalledWith('/classes/class_1/roster', 'token_123')
  })

  it('does not fetch when classId is empty', () => {
    const { result } = renderHook(() => useRoster(''), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})
