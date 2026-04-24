import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useClasses } from './useClasses'
import { apiFetch } from '../lib/api'

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}))

const mockApiFetch = vi.mocked(apiFetch)

const mockClassPage = {
  data: [{ id: 'cls_1', title: 'Morning Yoga' }],
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

describe('useClasses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches classes without extra params by default', async () => {
    mockApiFetch.mockResolvedValue(mockClassPage)

    const { result } = renderHook(() => useClasses(), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(mockClassPage))
    expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('page=1'))
  })

  it('includes categoryId in the request when provided', async () => {
    mockApiFetch.mockResolvedValue(mockClassPage)

    renderHook(() => useClasses({ categoryId: 'cat_1' }), { wrapper })

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('categoryId=cat_1'))
    })
  })

  it('includes search in the request when provided', async () => {
    mockApiFetch.mockResolvedValue(mockClassPage)

    renderHook(() => useClasses({ search: 'yoga' }), { wrapper })

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('search=yoga'))
    })
  })

  it('does not include search in the request when not provided', async () => {
    mockApiFetch.mockResolvedValue(mockClassPage)

    const { result } = renderHook(() => useClasses(), { wrapper })

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(mockApiFetch).toHaveBeenCalledWith(expect.not.stringContaining('search='))
  })
})
