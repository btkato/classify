import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Server as HttpServer } from 'http'

vi.mock('socket.io', () => ({
  Server: vi.fn().mockImplementation(() => ({})),
}))

describe('socket singleton', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('getIo throws before initSocket is called', async () => {
    const { getIo } = await import('./socket.js')
    expect(() => getIo()).toThrow('Socket.io not initialized')
  })

  it('getIo returns the Server instance after initSocket', async () => {
    const { getIo, initSocket } = await import('./socket.js')
    const mockServer = {} as HttpServer
    initSocket(mockServer, ['http://localhost:5173'])
    expect(getIo()).toBeDefined()
  })
})
