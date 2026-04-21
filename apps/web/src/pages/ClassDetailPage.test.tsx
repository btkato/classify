import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ClassDetailPage from './ClassDetailPage'
import { apiFetch } from '../lib/api'

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}))

vi.mock('@clerk/clerk-react', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '@clerk/clerk-react'

const mockApiFetch = vi.mocked(apiFetch)
const mockUseAuth = vi.mocked(useAuth)

const mockClass = {
  id: 'cls_1',
  title: 'Morning Yoga Flow',
  description: 'A relaxing morning session.',
  categoryId: 'cat_1',
  instructorId: 'user_1',
  capacity: 10,
  enrolledCount: 6,
  startsAt: '2026-05-01T09:00:00.000Z',
  durationMinutes: 60,
  location: 'Studio A',
  status: 'ACTIVE',
  classNumber: 1,
}

const mockClassFull = {
  ...mockClass,
  capacity: 8,
  enrolledCount: 8,
}

function renderPage(id = 'cls_1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/classes/${id}`]}>
        <Routes>
          <Route path="/classes/:id" element={<ClassDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ClassDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state while data is fetching', () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, getToken: vi.fn() } as never)
    mockApiFetch.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders class details once loaded', async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, getToken: vi.fn() } as never)
    mockApiFetch.mockResolvedValueOnce(mockClass)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Morning Yoga Flow')).toBeInTheDocument()
      expect(screen.getByText('A relaxing morning session.')).toBeInTheDocument()
      expect(screen.getByText('Studio A')).toBeInTheDocument()
    })
  })

  it('shows "Sign in to enroll" button for a guest', async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, getToken: vi.fn() } as never)
    mockApiFetch.mockResolvedValueOnce(mockClass)

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign in to enroll' })).toBeInTheDocument()
    })
  })

  it('shows "Enroll" button when signed in and space is available', async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, getToken: vi.fn().mockResolvedValue('token_123') } as never)
    mockApiFetch.mockResolvedValueOnce(mockClass)

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enroll' })).toBeInTheDocument()
    })
  })

  it('shows "Join Waitlist" button when signed in and class is full', async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, getToken: vi.fn().mockResolvedValue('token_123') } as never)
    mockApiFetch.mockResolvedValueOnce(mockClassFull)

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Join Waitlist' })).toBeInTheDocument()
    })
  })

  it('redirects guest to sign-in with return URL when "Sign in to enroll" is clicked', async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, getToken: vi.fn() } as never)
    mockApiFetch.mockResolvedValueOnce(mockClass)

    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sign in to enroll' })).toBeInTheDocument()
    )

    await userEvent.click(screen.getByRole('button', { name: 'Sign in to enroll' }))

    await waitFor(() => {
      expect(screen.queryByText('Morning Yoga Flow')).not.toBeInTheDocument()
    })
  })
})
