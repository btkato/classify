import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MembershipsPage from './MembershipsPage'
import { apiFetch } from '../lib/api'

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn().mockReturnValue({ getToken: vi.fn().mockResolvedValue('token_123') }),
}))

const mockApiFetch = vi.mocked(apiFetch)

const now = new Date().toISOString()

const continuousMonthly = {
  id: 'mem_1',
  type: 'CONTINUOUS_MONTHLY',
  status: 'ACTIVE',
  expiresAt: '2026-05-21T00:00:00.000Z',
  classesRemaining: null,
  classesTotal: null,
  priority: 1,
  createdAt: now,
  updatedAt: now,
}

const classPack = {
  id: 'mem_2',
  type: 'CLASS_PACK_10',
  status: 'ACTIVE',
  expiresAt: null,
  classesRemaining: 7,
  classesTotal: 10,
  priority: 2,
  createdAt: now,
  updatedAt: now,
}

const emptyHistory = { data: [], total: 0, page: 1, totalPages: 0 }

const historyPage1 = {
  data: [
    { ...continuousMonthly, status: 'ACTIVE' },
    { ...classPack, status: 'ACTIVE' },
    { id: 'mem_3', type: 'MONTHLY', status: 'EXPIRED', expiresAt: '2026-03-01T00:00:00.000Z', classesRemaining: null, classesTotal: null, priority: 1, createdAt: now, updatedAt: now },
  ],
  total: 8,
  page: 1,
  totalPages: 2,
}

const historyPage2 = {
  data: [
    { id: 'mem_4', type: 'CLASS_PACK_5', status: 'EXHAUSTED', expiresAt: null, classesRemaining: 0, classesTotal: 5, priority: 2, createdAt: now, updatedAt: now },
  ],
  total: 8,
  page: 2,
  totalPages: 2,
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MembershipsPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('MembershipsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state while data is fetching', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows empty state when there are no active memberships', async () => {
    mockApiFetch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(emptyHistory)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/no active memberships/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /purchase a membership/i })).toBeInTheDocument()
    })
  })

  it('renders active membership cards with type and detail', async () => {
    mockApiFetch
      .mockResolvedValueOnce([continuousMonthly, classPack])
      .mockResolvedValueOnce(emptyHistory)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Continuous Monthly')).toBeInTheDocument()
      expect(screen.getByText('Class Pack (10)')).toBeInTheDocument()
      expect(screen.getByText(/7 classes remaining/i)).toBeInTheDocument()
    })
  })

  it('shows cancel button only on CONTINUOUS_MONTHLY cards', async () => {
    mockApiFetch
      .mockResolvedValueOnce([continuousMonthly, classPack])
      .mockResolvedValueOnce(emptyHistory)

    renderPage()

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /cancel/i })).toHaveLength(1)
    })
  })

  it('shows inline confirm state when Cancel is clicked', async () => {
    mockApiFetch
      .mockResolvedValueOnce([continuousMonthly])
      .mockResolvedValueOnce(emptyHistory)

    renderPage()

    await waitFor(() => screen.getByRole('button', { name: /^cancel$/i }))

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(screen.getByRole('button', { name: /confirm cancel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /keep/i })).toBeInTheDocument()
  })

  it('reverts to normal card when Keep is clicked', async () => {
    mockApiFetch
      .mockResolvedValueOnce([continuousMonthly])
      .mockResolvedValueOnce(emptyHistory)

    renderPage()

    await waitFor(() => screen.getByRole('button', { name: /^cancel$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    await userEvent.click(screen.getByRole('button', { name: /keep/i }))

    expect(screen.queryByRole('button', { name: /confirm cancel/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
  })

  it('fires the cancel mutation and invalidates queries when Confirm Cancel is clicked', async () => {
    mockApiFetch
      .mockResolvedValueOnce([continuousMonthly])
      .mockResolvedValueOnce(emptyHistory)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(emptyHistory)

    renderPage()

    await waitFor(() => screen.getByRole('button', { name: /^cancel$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    await userEvent.click(screen.getByRole('button', { name: /confirm cancel/i }))

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/memberships/mem_1/cancel',
        'token_123',
        { method: 'PATCH' }
      )
    })
  })

  it('renders purchase history rows from the history endpoint', async () => {
    mockApiFetch
      .mockResolvedValueOnce([continuousMonthly])
      .mockResolvedValueOnce(historyPage1)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Monthly')).toBeInTheDocument()
      expect(screen.getByText(/expired/i)).toBeInTheDocument()
    })
  })

  it('shows "Showing X-Y of Z" count above the history table', async () => {
    mockApiFetch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(historyPage1)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/showing 1.+3 of 8/i)).toBeInTheDocument()
    })
  })

  it('disables Previous button on page 1', async () => {
    mockApiFetch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(historyPage1)

    renderPage()

    await waitFor(() => screen.getByRole('button', { name: /previous/i }))

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
  })

  it('advances to page 2 when Next is clicked', async () => {
    mockApiFetch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(historyPage1)
      .mockResolvedValueOnce(historyPage2)

    renderPage()

    await waitFor(() => screen.getByRole('button', { name: /next/i }))
    await userEvent.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByText('Class Pack (5)')).toBeInTheDocument()
    })
  })

  it('disables Next button on the last page', async () => {
    mockApiFetch
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(historyPage1)
      .mockResolvedValueOnce(historyPage2)

    renderPage()

    await waitFor(() => screen.getByRole('button', { name: /next/i }))
    await userEvent.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
    })
  })
})
