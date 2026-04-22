import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import InstructorRosterPage from './InstructorRosterPage'

vi.mock('../hooks/useRoster', () => ({
  useRoster: vi.fn(),
}))

vi.mock('../hooks/useClass', () => ({
  useClass: vi.fn(),
}))

import { useRoster } from '../hooks/useRoster'
import { useClass } from '../hooks/useClass'

const mockUseRoster = vi.mocked(useRoster)
const mockUseClass = vi.mocked(useClass)

const mockClass = {
  id: 'class_1',
  title: 'Morning Yoga Flow',
  startsAt: '2026-05-01T09:00:00.000Z',
  durationMinutes: 60,
  location: 'Studio A',
  status: 'ACTIVE',
  enrolledCount: 1,
  capacity: 12,
  categoryId: 'cat_1',
  instructorId: 'user_1',
  classNumber: 1,
  description: null,
}

const enrolled = {
  id: 'reg_1',
  status: 'ENROLLED',
  waitlistPosition: null,
  user: { id: 'user_2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
}

const waitlisted = {
  id: 'reg_2',
  status: 'WAITLISTED',
  waitlistPosition: 1,
  user: { id: 'user_3', firstName: 'John', lastName: 'Smith', email: 'john@example.com' },
}

function renderPage(id = 'class_1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/instructor/classes/${id}/roster`]}>
        <Routes>
          <Route path="/instructor/classes/:id/roster" element={<InstructorRosterPage />} />
          <Route path="/instructor/classes/:id" element={<p>Class Detail</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('InstructorRosterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state while data is fetching', () => {
    mockUseClass.mockReturnValue({ isLoading: true, data: undefined } as never)
    mockUseRoster.mockReturnValue({ isLoading: true, data: undefined } as never)

    renderPage()

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders the class title as the page heading', async () => {
    mockUseClass.mockReturnValue({ isLoading: false, data: mockClass } as never)
    mockUseRoster.mockReturnValue({ isLoading: false, data: [enrolled] } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Morning Yoga Flow')).toBeInTheDocument()
    })
  })

  it('renders enrolled students', async () => {
    mockUseClass.mockReturnValue({ isLoading: false, data: mockClass } as never)
    mockUseRoster.mockReturnValue({ isLoading: false, data: [enrolled] } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Enrolled')).toBeInTheDocument()
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    })
  })

  it('renders waitlisted students with their position', async () => {
    mockUseClass.mockReturnValue({ isLoading: false, data: mockClass } as never)
    mockUseRoster.mockReturnValue({ isLoading: false, data: [enrolled, waitlisted] } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Waitlist')).toBeInTheDocument()
      expect(screen.getByText('John Smith')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('#1')).toBeInTheDocument()
    })
  })

  it('shows empty state when roster is empty', async () => {
    mockUseClass.mockReturnValue({ isLoading: false, data: mockClass } as never)
    mockUseRoster.mockReturnValue({ isLoading: false, data: [] } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('No students enrolled yet.')).toBeInTheDocument()
    })
  })

  it('links back to the class detail page', async () => {
    mockUseClass.mockReturnValue({ isLoading: false, data: mockClass } as never)
    mockUseRoster.mockReturnValue({ isLoading: false, data: [enrolled] } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('link', { name: '← Back to Class' })).toBeInTheDocument()
    })
  })
})
