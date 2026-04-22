import '@testing-library/jest-dom'
import { vi } from 'vitest'

Element.prototype.hasPointerCapture = vi.fn() as never
Element.prototype.setPointerCapture = vi.fn() as never
Element.prototype.releasePointerCapture = vi.fn() as never
Element.prototype.scrollIntoView = vi.fn() as never

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
