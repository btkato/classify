import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSocket } from './useSocket'

const { mockOn, mockOff, mockDisconnect, mockIo } = vi.hoisted(() => {
  const mockOn = vi.fn()
  const mockOff = vi.fn()
  const mockDisconnect = vi.fn()
  const mockIo = vi.fn().mockReturnValue({ on: mockOn, off: mockOff, disconnect: mockDisconnect })
  return { mockOn, mockOff, mockDisconnect, mockIo }
})

vi.mock('socket.io-client', () => ({ io: mockIo }))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn().mockReturnValue({ invalidateQueries: vi.fn() }),
}))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'

beforeEach(() => {
  vi.clearAllMocks()
  mockIo.mockReturnValue({ on: mockOn, off: mockOff, disconnect: mockDisconnect })
})

describe('useSocket', () => {
  it('does not connect when user is not signed in', () => {
    vi.mocked(useAuth).mockReturnValue({ isSignedIn: false, userId: null } as never)

    renderHook(() => useSocket())

    expect(mockIo).not.toHaveBeenCalled()
  })

  it('connects and registers new-message handler when signed in', () => {
    vi.mocked(useAuth).mockReturnValue({ isSignedIn: true, userId: 'user_1' } as never)

    renderHook(() => useSocket())

    expect(mockIo).toHaveBeenCalledWith(expect.any(String), { auth: { userId: 'user_1' } })
    expect(mockOn).toHaveBeenCalledWith('new-message', expect.any(Function))
  })

  it('invalidates inbox and thread queries when new-message is received', () => {
    const mockInvalidateQueries = vi.fn()
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries: mockInvalidateQueries } as never)
    vi.mocked(useAuth).mockReturnValue({ isSignedIn: true, userId: 'user_1' } as never)

    renderHook(() => useSocket())

    const handler = vi.mocked(mockOn).mock.calls[0]?.[1] as (payload: { threadId: string }) => void
    handler({ threadId: 'thread_abc' })

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['inbox'] })
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['thread', 'thread_abc'] })
  })

  it('removes the handler and disconnects on unmount', () => {
    vi.mocked(useAuth).mockReturnValue({ isSignedIn: true, userId: 'user_1' } as never)

    const { unmount } = renderHook(() => useSocket())
    unmount()

    expect(mockOff).toHaveBeenCalledWith('new-message', expect.any(Function))
    expect(mockDisconnect).toHaveBeenCalled()
  })
})
