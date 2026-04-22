import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import InstructorClassDetailPage from './InstructorClassDetailPage'
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
  id: 'class_1',
  title: 'Morning Yoga Flow',
  description: 'A relaxing morning session.',
  categoryId: 'cat_1',
  instructorId: 'user_1',
  capacity: 12,
  enrolledCount: 8,
  startsAt: '2026-05-01T09:00:00.000Z',
  durationMinutes: 60,
  location: 'Studio A',
  status: 'ACTIVE',
  classNumber: 1,
}

function renderPage(id = 'class_1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/instructor/classes/${id}`]}>
        <Routes>
          <Route path="/instructor/classes/:id" element={<InstructorClassDetailPage />} />
          <Route path="/instructor/classes/:id/roster" element={<p>Roster Page</p>} />
          <Route path="/instructor/classes" element={<p>Class List</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('InstructorClassDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ getToken: vi.fn().mockResolvedValue('token_123') } as never)
  })

  it('shows a loading state while data is fetching', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders class info once loaded', async () => {
    mockApiFetch.mockResolvedValueOnce(mockClass)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Morning Yoga Flow')).toBeInTheDocument()
      expect(screen.getByText('Studio A')).toBeInTheDocument()
      expect(screen.getByText('ACTIVE')).toBeInTheDocument()
      expect(screen.getByText('8 / 12 enrolled')).toBeInTheDocument()
    })
  })

  it('pre-fills the form with existing description and location', async () => {
    mockApiFetch.mockResolvedValueOnce(mockClass)
    renderPage()

    await waitFor(() => {
      expect(screen.getByDisplayValue('A relaxing morning session.')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Studio A')).toBeInTheDocument()
    })
  })

  it('navigates to roster page when View Roster is clicked', async () => {
    mockApiFetch.mockResolvedValueOnce(mockClass)
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'View Roster' })).toBeInTheDocument()
    )

    await userEvent.click(screen.getByRole('link', { name: 'View Roster' }))

    await waitFor(() => {
      expect(screen.getByText('Roster Page')).toBeInTheDocument()
    })
  })

  it('calls PATCH /classes/:id with updated fields on save', async () => {
    mockApiFetch.mockResolvedValueOnce(mockClass)
    mockApiFetch.mockResolvedValueOnce({ ...mockClass, location: 'Studio B' })
    renderPage()

    await waitFor(() =>
      expect(screen.getByDisplayValue('Studio A')).toBeInTheDocument()
    )

    await userEvent.clear(screen.getByLabelText('Location'))
    await userEvent.type(screen.getByLabelText('Location'), 'Studio B')
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/classes/class_1',
        'token_123',
        expect.objectContaining({ method: 'PATCH' })
      )
    })
  })

  it('shows success message after save', async () => {
    mockApiFetch.mockResolvedValueOnce(mockClass)
    mockApiFetch.mockResolvedValueOnce({ ...mockClass, location: 'Studio B' })
    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
    )

    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(screen.getByText('Changes saved.')).toBeInTheDocument()
    })
  })
})
