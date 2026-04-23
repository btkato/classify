import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RoleProtectedRoute from './RoleProtectedRoute'

vi.mock('../hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}))

import { useCurrentUser } from '../hooks/useCurrentUser'
import { useAuth } from '@clerk/clerk-react'

const mockUseCurrentUser = vi.mocked(useCurrentUser)
const mockUseAuth = vi.mocked(useAuth)

function renderRoute(role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/instructor']}>
        <Routes>
          <Route
            path="/instructor"
            element={
              <RoleProtectedRoute role={role}>
                <p>Protected content</p>
              </RoleProtectedRoute>
            }
          />
          <Route path="/dashboard" element={<p>Dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RoleProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true } as never)
  })

  it('renders nothing while user data is loading', () => {
    mockUseCurrentUser.mockReturnValue({ isLoading: true, data: undefined } as never)

    const { container } = renderRoute('INSTRUCTOR')

    expect(container).toBeEmptyDOMElement()
  })

  it('renders children when user has the required role', () => {
    mockUseCurrentUser.mockReturnValue({
      isLoading: false,
      data: { roles: [{ role: 'STUDENT' }, { role: 'INSTRUCTOR' }] },
    } as never)

    renderRoute('INSTRUCTOR')

    expect(screen.getByText('Protected content')).toBeInTheDocument()
  })

  it('redirects to /dashboard when user does not have the required role', () => {
    mockUseCurrentUser.mockReturnValue({
      isLoading: false,
      data: { roles: [{ role: 'STUDENT' }] },
    } as never)

    renderRoute('INSTRUCTOR')

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('redirects to /dashboard when user data is missing', () => {
    mockUseCurrentUser.mockReturnValue({
      isLoading: false,
      data: undefined,
    } as never)

    renderRoute('INSTRUCTOR')

    expect(screen.queryByText('Protected content')).not.toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
