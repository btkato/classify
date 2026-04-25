import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useInbox } from './useInbox'
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

const mockThreads = [
  {
    threadId: 'thread_1',
    type: 'DIRECT',
    classId: null,
    className: null,
    participants: [
      { userId: 'user_admin', canReply: true, user: { firstName: 'Admin', lastName: 'User' } },
      { userId: 'user_instructor', canReply: true, user: { firstName: 'Jane', lastName: 'Smith' } },
    ],
    latestMessage: {
      id: 'msg_1',
      body: 'Hello',
      sentAt: '2026-04-24T10:00:00.000Z',
      senderId: 'user_instructor',
      readAt: null,
    },
  },
]

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useInbox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches inbox when signed in', async () => {
    mockUseAuth.mockReturnValue({
      isSignedIn: true,
      getToken: vi.fn().mockResolvedValue('token_123'),
    } as never)
    mockApiFetch.mockResolvedValue(mockThreads)

    const { result } = renderHook(() => useInbox(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(mockThreads))
    expect(mockApiFetch).toHaveBeenCalledWith('/messages', 'token_123')
  })

  it('does not fetch when not signed in', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, getToken: vi.fn() } as never)

    const { result } = renderHook(() => useInbox(), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})
