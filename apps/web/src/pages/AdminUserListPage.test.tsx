import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminUserListPage from './AdminUserListPage'

vi.mock('../hooks/useAdminUsers', () => ({
  useAdminUsers: vi.fn(),
}))

import { useAdminUsers } from '../hooks/useAdminUsers'

const mockUseAdminUsers = vi.mocked(useAdminUsers)

const users = [
  {
    id: 'user_1',
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'sarah.chen@example.com',
    phone: null,
    createdAt: '2025-04-02T00:00:00.000Z',
    roles: [{ role: 'STUDENT' }, { role: 'INSTRUCTOR' }],
  },
  {
    id: 'user_2',
    firstName: 'James',
    lastName: 'Webb',
    email: 'james@example.com',
    phone: null,
    createdAt: '2025-01-15T00:00:00.000Z',
    roles: [{ role: 'STUDENT' }],
  },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route path="/admin/users" element={<AdminUserListPage />} />
          <Route path="/admin" element={<p>Admin Dashboard</p>} />
          <Route path="/admin/users/:id" element={<p>User Detail</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminUserListPage', () => {
  const defaultPageData = { data: users, total: 2, page: 1, totalPages: 1 }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAdminUsers.mockReturnValue({ isLoading: false, data: defaultPageData } as never)
  })

  it('renders the list of users', () => {
    renderPage()
    expect(screen.getByText('Sarah Chen')).toBeInTheDocument()
    expect(screen.getByText('James Webb')).toBeInTheDocument()
  })

  it('shows a skeleton while loading', () => {
    mockUseAdminUsers.mockReturnValue({ isLoading: true, data: undefined } as never)
    renderPage()
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('renders role badges for each user', () => {
    renderPage()
    expect(screen.getAllByText('STUDENT')).toHaveLength(2)
    expect(screen.getByText('INSTRUCTOR')).toBeInTheDocument()
  })

  it('renders a View link for each user pointing to their detail page', () => {
    renderPage()
    expect(screen.getByTestId('view-user_1')).toHaveAttribute('href', '/admin/users/user_1')
    expect(screen.getByTestId('view-user_2')).toHaveAttribute('href', '/admin/users/user_2')
  })

  it('passes the search value to useAdminUsers when the user types', async () => {
    renderPage()
    await userEvent.type(screen.getByPlaceholderText('Search by name or email…'), 'sarah')
    expect(mockUseAdminUsers).toHaveBeenCalledWith(expect.objectContaining({ search: 'sarah' }))
  })

  it('resets to page 1 when search changes', async () => {
    mockUseAdminUsers.mockReturnValue({
      isLoading: false,
      data: { data: users, total: 40, page: 2, totalPages: 2 },
    } as never)
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.type(screen.getByPlaceholderText('Search by name or email…'), 'a')
    expect(mockUseAdminUsers).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
  })

  it('shows pagination controls when there are multiple pages', () => {
    mockUseAdminUsers.mockReturnValue({
      isLoading: false,
      data: { data: users, total: 40, page: 1, totalPages: 2 },
    } as never)
    renderPage()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('hides pagination controls when there is only one page', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })
})
