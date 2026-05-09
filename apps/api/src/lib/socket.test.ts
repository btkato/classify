import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Server as HttpServer } from 'http'

const { mockVerifyToken, mockUse } = vi.hoisted(() => ({
  mockVerifyToken: vi.fn(),
  mockUse: vi.fn(),
}))

vi.mock('@clerk/express', () => ({ verifyToken: mockVerifyToken }))

vi.mock('socket.io', () => ({
  Server: vi.fn().mockImplementation(() => ({ use: mockUse })),
}))

describe('socket singleton', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('getIo throws before initSocket is called', async () => {
    const { getIo } = await import('./socket.js')
    expect(() => getIo()).toThrow('Socket.io not initialized')
  })

  it('getIo returns the Server instance after initSocket', async () => {
    const { getIo, initSocket } = await import('./socket.js')
    initSocket({} as HttpServer, ['http://localhost:5173'], 'test_secret')
    expect(getIo()).toBeDefined()
  })
})

describe('socket JWT middleware', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  async function getMiddleware() {
    const { initSocket } = await import('./socket.js')
    initSocket({} as HttpServer, ['http://localhost:5173'], 'test_secret')
    const firstCall = mockUse.mock.calls.at(0)
    if (!firstCall) throw new Error('mockUse was not called')
    return firstCall.at(0) as (socket: unknown, next: (err?: Error) => void) => Promise<void>
  }

  it('calls next with an error when no token is provided', async () => {
    const middleware = await getMiddleware()
    const mockNext = vi.fn()
    await middleware({ handshake: { auth: {} }, data: {} }, mockNext)
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
  })

  it('calls next with an error when verifyToken throws', async () => {
    mockVerifyToken.mockRejectedValue(new Error('Invalid JWT'))
    const middleware = await getMiddleware()
    const mockNext = vi.fn()
    await middleware({ handshake: { auth: { token: 'bad_token' } }, data: {} }, mockNext)
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
  })

  it('sets socket.data.userId from JWT sub and calls next with no error when token is valid', async () => {
    mockVerifyToken.mockResolvedValue({ sub: 'user_clerk_123' })
    const middleware = await getMiddleware()
    const mockNext = vi.fn()
    const mockSocket = { handshake: { auth: { token: 'valid_token' } }, data: {} as Record<string, unknown> }
    await middleware(mockSocket, mockNext)
    expect(mockNext).toHaveBeenCalledWith()
    expect(mockSocket.data['userId']).toBe('user_clerk_123')
  })
})
