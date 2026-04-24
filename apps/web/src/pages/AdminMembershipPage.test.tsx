import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminMembershipPage from './AdminMembershipPage'

vi.mock('../hooks/useAdminMemberships', () => ({
  useAdminMemberships: vi.fn(),
}))

vi.mock('../hooks/useUpdateMembership', () => ({
  useUpdateMembership: vi.fn(),
}))

vi.mock('../hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}))

import { useAdminMemberships } from '../hooks/useAdminMemberships'
import { useUpdateMembership } from '../hooks/useUpdateMembership'

const mockUseAdminMemberships = vi.mocked(useAdminMemberships)
const mockUseUpdateMembership = vi.mocked(useUpdateMembership)

const memberships = [
  {
    id: 'mem_1',
    userId: 'user_1',
    type: 'MONTHLY',
    status: 'ACTIVE',
    expiresAt: '2025-05-15T00:00:00.000Z',
    classesRemaining: null,
    classesTotal: null,
    priority: 1,
    createdAt: '2025-04-01T00:00:00.000Z',
    updatedAt: '2025-04-01T00:00:00.000Z',
    user: { email: 'sarah.chen@example.com', firstName: 'Sarah', lastName: 'Chen' },
  },
  {
    id: 'mem_2',
    userId: 'user_2',
    type: 'CLASS_PACK_10',
    status: 'ACTIVE',
    expiresAt: null,
    classesRemaining: 7,
    classesTotal: 10,
    priority: 2,
    createdAt: '2025-04-01T00:00:00.000Z',
    updatedAt: '2025-04-01T00:00:00.000Z',
    user: { email: 'james@example.com', firstName: 'James', lastName: 'Webb' },
  },
  {
    id: 'mem_3',
    userId: 'user_3',
    type: 'YEARLY',
    status: 'CANCELLED',
    expiresAt: '2025-12-01T00:00:00.000Z',
    classesRemaining: null,
    classesTotal: null,
    priority: 1,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-03-01T00:00:00.000Z',
    user: { email: 'alex@example.com', firstName: 'Alex', lastName: 'Brown' },
  },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/memberships']}>
        <Routes>
          <Route path="/admin/memberships" element={<AdminMembershipPage />} />
          <Route path="/admin" element={<p>Admin Dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminMembershipPage', () => {
  const defaultPageData = { data: memberships, total: 3, page: 1, totalPages: 1 }
  const mockMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAdminMemberships.mockReturnValue({ isLoading: false, data: defaultPageData } as never)
    mockUseUpdateMembership.mockReturnValue({ mutate: mockMutate, isPending: false } as never)
  })

  it('renders the list of memberships with user emails', () => {
    renderPage()
    expect(screen.getByText('sarah.chen@example.com')).toBeInTheDocument()
    expect(screen.getByText('james@example.com')).toBeInTheDocument()
  })

  it('shows a skeleton while loading', () => {
    mockUseAdminMemberships.mockReturnValue({ isLoading: true, data: undefined } as never)
    renderPage()
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('shows classes remaining for class packs', () => {
    renderPage()
    expect(screen.getByText('7 / 10')).toBeInTheDocument()
  })

  it('shows a dash for remaining when the membership is time-based', () => {
    renderPage()
    const dashCells = screen.getAllByText('—')
    expect(dashCells.length).toBeGreaterThan(0)
  })

  it('shows a Cancel button only for active memberships', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByTestId('cancel-mem_1')).toBeInTheDocument()
      expect(screen.getByTestId('cancel-mem_2')).toBeInTheDocument()
      expect(screen.queryByTestId('cancel-mem_3')).not.toBeInTheDocument()
    })
  })

  it('opens the cancel confirmation dialog when Cancel is clicked', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('cancel-mem_1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('cancel-mem_1'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /cancel membership/i })).toBeInTheDocument()
  })

  it('closes the dialog without calling mutate when Cancel button is clicked', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('cancel-mem_1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('cancel-mem_1'))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('calls mutate with CANCELLED status when cancellation is confirmed', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('cancel-mem_1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('cancel-mem_1'))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel membership' }))
    expect(mockMutate).toHaveBeenCalledWith(
      { status: 'CANCELLED' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('passes the selected status filter to useAdminMemberships', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Active' }))
    expect(mockUseAdminMemberships).toHaveBeenCalledWith(expect.objectContaining({ status: 'ACTIVE' }))
  })

  it('passes the search term to useAdminMemberships', async () => {
    renderPage()
    await userEvent.type(screen.getByPlaceholderText('Search by name or email…'), 'alice')
    expect(mockUseAdminMemberships).toHaveBeenCalledWith(expect.objectContaining({ search: 'alice' }))
  })

  it('shows pagination when there are multiple pages', () => {
    mockUseAdminMemberships.mockReturnValue({
      isLoading: false,
      data: { data: memberships, total: 40, page: 1, totalPages: 2 },
    } as never)
    renderPage()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
  })
})
