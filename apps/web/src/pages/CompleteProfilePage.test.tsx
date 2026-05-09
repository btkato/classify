import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CompleteProfilePage from './CompleteProfilePage'

vi.mock('../hooks/useCurrentUser', () => ({ useCurrentUser: vi.fn() }))
vi.mock('../hooks/useUpdateProfile', () => ({ useUpdateProfile: vi.fn() }))

import { useCurrentUser } from '../hooks/useCurrentUser'
import { useUpdateProfile } from '../hooks/useUpdateProfile'

const mockUseCurrentUser = vi.mocked(useCurrentUser)
const mockUseUpdateProfile = vi.mocked(useUpdateProfile)

const mockCurrentUser = {
  id: 'user_1',
  email: 'jane@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  phone: null,
  dateOfBirth: null,
  roles: [{ role: 'STUDENT' }],
}

const mockCompleteUser = {
  ...mockCurrentUser,
  phone: '5551234567',
  dateOfBirth: '1990-01-15T00:00:00.000Z',
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/complete-profile']}>
        <Routes>
          <Route path="/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('CompleteProfilePage', () => {
  const mockMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseUpdateProfile.mockReturnValue({ mutate: mockMutate, isPending: false } as never)
  })

  it('renders phone and date of birth fields', () => {
    mockUseCurrentUser.mockReturnValue({ data: mockCurrentUser } as never)

    renderPage()

    expect(screen.getByLabelText('Phone number')).toBeInTheDocument()
    expect(screen.getByLabelText('Date of birth')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save and continue' })).toBeInTheDocument()
  })

  it('shows a validation error when phone is empty on submit', async () => {
    mockUseCurrentUser.mockReturnValue({ data: mockCurrentUser } as never)

    renderPage()

    fireEvent.change(screen.getByLabelText('Date of birth'), {
      target: { value: '1990-01-15' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(screen.getByText('Phone number is required')).toBeInTheDocument()
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('shows a validation error when date of birth is empty on submit', async () => {
    mockUseCurrentUser.mockReturnValue({ data: mockCurrentUser } as never)

    renderPage()

    await userEvent.type(screen.getByLabelText('Phone number'), '5551234567')
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(screen.getByText('Date of birth is required')).toBeInTheDocument()
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('calls updateProfile mutate with phone and dateOfBirth when form is valid', async () => {
    mockUseCurrentUser.mockReturnValue({ data: mockCurrentUser } as never)

    renderPage()

    await userEvent.type(screen.getByLabelText('Phone number'), '5551234567')
    fireEvent.change(screen.getByLabelText('Date of birth'), {
      target: { value: '1990-01-15' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Save and continue' }))

    expect(mockMutate).toHaveBeenCalledWith(
      { userId: 'user_1', phone: '5551234567', dateOfBirth: '1990-01-15' },
      expect.any(Object)
    )
  })

  it('redirects to /dashboard when user profile is already complete', () => {
    mockUseCurrentUser.mockReturnValue({ data: mockCompleteUser } as never)

    renderPage()

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
