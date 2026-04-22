import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminUserDetailPage from './AdminUserDetailPage'

vi.mock('../hooks/useAdminUser', () => ({
  useAdminUser: vi.fn(),
}))

vi.mock('../hooks/useUpdateUserRoles', () => ({
  useUpdateUserRoles: vi.fn(),
}))

import { useAdminUser } from '../hooks/useAdminUser'
import { useUpdateUserRoles } from '../hooks/useUpdateUserRoles'

const mockUseAdminUser = vi.mocked(useAdminUser)
const mockUseUpdateUserRoles = vi.mocked(useUpdateUserRoles)

const instructorUser = {
  id: 'user_1',
  firstName: 'Sarah',
  lastName: 'Chen',
  email: 'sarah.chen@example.com',
  phone: '555-0100',
  createdAt: '2025-04-02T00:00:00.000Z',
  roles: [{ role: 'STUDENT' }, { role: 'INSTRUCTOR' }],
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/users/user_1']}>
        <Routes>
          <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
          <Route path="/admin/users" element={<p>Users List</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminUserDetailPage', () => {
  const mockMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAdminUser.mockReturnValue({ isLoading: false, data: instructorUser } as never)
    mockUseUpdateUserRoles.mockReturnValue({ mutate: mockMutate, isPending: false } as never)
  })

  it('renders the user name and profile details', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument()
      expect(screen.getByText('sarah.chen@example.com')).toBeInTheDocument()
      expect(screen.getByText('555-0100')).toBeInTheDocument()
    })
  })

  it('shows a skeleton while loading', () => {
    mockUseAdminUser.mockReturnValue({ isLoading: true, data: undefined } as never)
    renderPage()
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('shows a dash for phone when null', async () => {
    mockUseAdminUser.mockReturnValue({
      isLoading: false,
      data: { ...instructorUser, phone: null },
    } as never)
    renderPage()
    await waitFor(() => expect(screen.getByText('—')).toBeInTheDocument())
  })

  it('locks the STUDENT role with a default label and no action button', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Default role')).toBeInTheDocument())
    expect(screen.queryByTestId('revoke-STUDENT')).not.toBeInTheDocument()
    expect(screen.queryByTestId('grant-STUDENT')).not.toBeInTheDocument()
  })

  it('shows a Revoke button for roles the user holds', async () => {
    renderPage()
    await waitFor(() =>
      expect(screen.getByTestId('revoke-INSTRUCTOR')).toBeInTheDocument()
    )
  })

  it('shows a Grant button for roles the user does not hold', async () => {
    renderPage()
    await waitFor(() =>
      expect(screen.getByTestId('grant-ADMIN')).toBeInTheDocument()
    )
  })

  it('calls mutate with grant action when Grant is clicked', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('grant-ADMIN')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('grant-ADMIN'))
    expect(mockMutate).toHaveBeenCalledWith({ role: 'ADMIN', action: 'grant' })
  })

  it('opens the revoke confirmation dialog when Revoke is clicked', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('revoke-INSTRUCTOR')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('revoke-INSTRUCTOR'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /revoke.*INSTRUCTOR/i })).toBeInTheDocument()
  })

  it('closes the dialog without calling mutate when Cancel is clicked', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('revoke-INSTRUCTOR')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('revoke-INSTRUCTOR'))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('calls mutate with revoke action when revoke is confirmed', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByTestId('revoke-INSTRUCTOR')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('revoke-INSTRUCTOR'))
    await userEvent.click(screen.getByRole('button', { name: 'Revoke role' }))
    expect(mockMutate).toHaveBeenCalledWith(
      { role: 'INSTRUCTOR', action: 'revoke' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })
})
