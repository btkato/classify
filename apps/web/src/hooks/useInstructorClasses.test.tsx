import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useInstructorClasses } from './useInstructorClasses'
import { apiFetch } from '../lib/api'

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}))

vi.mock('./useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))

const mockGetToken = vi.fn().mockResolvedValue('test-token')

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}))

import { useCurrentUser } from './useCurrentUser'

const mockApiFetch = vi.mocked(apiFetch)
const mockUseCurrentUser = vi.mocked(useCurrentUser)

const mockClassPage = {
  data: [{ id: 'class_1', title: 'Morning Yoga' }],
  total: 1,
  page: 1,
  totalPages: 1,
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useInstructorClasses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches classes for the current instructor when user is loaded', async () => {
    mockUseCurrentUser.mockReturnValue({ isLoading: false, data: { id: 'user_1' } } as never)
    mockApiFetch.mockResolvedValue(mockClassPage)

    const { result } = renderHook(() => useInstructorClasses(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(mockClassPage))
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining('instructorId=user_1'),
      'test-token'
    )
  })

  it('does not fetch when current user is loading', () => {
    mockUseCurrentUser.mockReturnValue({ isLoading: true, data: undefined } as never)

    const { result } = renderHook(() => useInstructorClasses(), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('passes page param to the API', async () => {
    mockUseCurrentUser.mockReturnValue({ isLoading: false, data: { id: 'user_1' } } as never)
    mockApiFetch.mockResolvedValue(mockClassPage)

    renderHook(() => useInstructorClasses({ page: 2 }), { wrapper })

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        'test-token'
      )
    })
  })

  it('passes search param to the API when provided', async () => {
    mockUseCurrentUser.mockReturnValue({ isLoading: false, data: { id: 'user_1' } } as never)
    mockApiFetch.mockResolvedValue(mockClassPage)

    renderHook(() => useInstructorClasses({ search: 'yoga' }), { wrapper })

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('search=yoga'),
        'test-token'
      )
    })
  })

  it('passes from and to params when provided', async () => {
    mockUseCurrentUser.mockReturnValue({ isLoading: false, data: { id: 'user_1' } } as never)
    mockApiFetch.mockResolvedValue(mockClassPage)

    const from = '2026-04-22T00:00:00.000Z'
    const to = '2026-04-29T00:00:00.000Z'

    renderHook(() => useInstructorClasses({ from, to }), { wrapper })

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining(`from=${encodeURIComponent(from)}`),
        'test-token'
      )
    })
  })
})
