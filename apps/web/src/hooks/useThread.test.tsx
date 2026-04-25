import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useThread } from './useThread'
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

const mockThread = {
  threadId: 'thread_1',
  type: 'DIRECT',
  classId: null,
  participants: [
    { userId: 'user_admin', canReply: true, user: { firstName: 'Admin', lastName: 'User' } },
    { userId: 'user_instructor', canReply: true, user: { firstName: 'Jane', lastName: 'Smith' } },
  ],
  messages: [
    {
      id: 'msg_1',
      threadId: 'thread_1',
      senderId: 'user_admin',
      body: 'Hello Jane',
      triggerId: null,
      readAt: null,
      sentAt: '2026-04-24T10:00:00.000Z',
    },
  ],
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useThread', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      getToken: vi.fn().mockResolvedValue('token_123'),
    } as never)
  })

  it('fetches thread when threadId is provided', async () => {
    mockApiFetch.mockResolvedValue(mockThread)

    const { result } = renderHook(() => useThread('thread_1'), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(mockThread))
    expect(mockApiFetch).toHaveBeenCalledWith('/messages/thread_1', 'token_123')
  })

  it('does not fetch when threadId is empty', () => {
    const { result } = renderHook(() => useThread(''), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockApiFetch).not.toHaveBeenCalled()
  })
})
