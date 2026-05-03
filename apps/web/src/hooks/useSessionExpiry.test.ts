import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSessionExpiry } from './useSessionExpiry'

const { mockAddListener, mockUnsubscribe, mockNavigate, mockRemoveQueries } = vi.hoisted(() => {
  const mockUnsubscribe = vi.fn()
  const mockAddListener = vi.fn().mockReturnValue(mockUnsubscribe)
  const mockNavigate = vi.fn()
  const mockRemoveQueries = vi.fn()
  return { mockAddListener, mockUnsubscribe, mockNavigate, mockRemoveQueries }
})

vi.mock('@clerk/clerk-react', () => ({
  useClerk: vi.fn().mockReturnValue({ addListener: mockAddListener }),
  useAuth: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn().mockReturnValue(mockNavigate),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn().mockReturnValue({ removeQueries: mockRemoveQueries }),
}))

import { useAuth } from '@clerk/clerk-react'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAuth).mockReturnValue({ isSignedIn: true } as never)
})

describe('useSessionExpiry', () => {
  it('does not subscribe when user is not signed in', () => {
    vi.mocked(useAuth).mockReturnValue({ isSignedIn: false } as never)

    renderHook(() => useSessionExpiry())

    expect(mockAddListener).not.toHaveBeenCalled()
  })

  it('subscribes to Clerk session changes when signed in', () => {
    renderHook(() => useSessionExpiry())

    expect(mockAddListener).toHaveBeenCalledOnce()
  })

  it('clears current-user cache and navigates to /sign-in when session expires', () => {
    renderHook(() => useSessionExpiry())

    const listener = vi.mocked(mockAddListener).mock.calls[0]?.[0] as (payload: { session: unknown }) => void
    listener({ session: null })

    expect(mockRemoveQueries).toHaveBeenCalledWith({ queryKey: ['current-user'] })
    expect(mockNavigate).toHaveBeenCalledWith('/sign-in')
  })

  it('does not navigate when session is still active', () => {
    renderHook(() => useSessionExpiry())

    const listener = vi.mocked(mockAddListener).mock.calls[0]?.[0] as (payload: { session: unknown }) => void
    listener({ session: { id: 'session_1' } })

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('unsubscribes when component unmounts', () => {
    const { unmount } = renderHook(() => useSessionExpiry())

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
