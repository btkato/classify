import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import InstructorDashboard from './InstructorDashboard'

vi.mock('../hooks/useInstructorClasses', () => ({
  useInstructorClasses: vi.fn(),
}))

import { useInstructorClasses } from '../hooks/useInstructorClasses'

const mockUseInstructorClasses = vi.mocked(useInstructorClasses)

const upcomingClass = {
  id: 'class_1',
  title: 'Morning Yoga',
  startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  durationMinutes: 60,
  location: 'Studio A',
  status: 'ACTIVE',
  enrolledCount: 8,
  capacity: 12,
  categoryId: 'cat_1',
  instructorId: 'user_1',
  classNumber: 1,
  description: null,
}

const pastClass = {
  ...upcomingClass,
  id: 'class_2',
  title: 'Saturday Stretch',
  startsAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  status: 'COMPLETED',
}

const emptyPage = { data: [], total: 0, page: 1, totalPages: 0 }
const upcomingPage = { data: [upcomingClass], total: 1, page: 1, totalPages: 1 }
const allClassesPage = { data: [upcomingClass, pastClass], total: 2, page: 1, totalPages: 1 }
const multiPage = { data: [upcomingClass], total: 15, page: 1, totalPages: 2 }

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/instructor']}>
        <Routes>
          <Route path="/instructor" element={<InstructorDashboard />} />
          <Route path="/instructor/classes/:id" element={<p>Class Detail</p>} />
          <Route path="/instructor/classes" element={<p>Class List</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('InstructorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state while data is fetching', () => {
    mockUseInstructorClasses.mockReturnValue({ isLoading: true, data: undefined } as never)

    renderPage()

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('renders upcoming classes this week', async () => {
    mockUseInstructorClasses
      .mockReturnValueOnce({ isLoading: false, data: upcomingPage } as never)
      .mockReturnValueOnce({ isLoading: false, data: allClassesPage } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Upcoming This Week')).toBeInTheDocument()
      expect(screen.getAllByText('Morning Yoga').length).toBeGreaterThan(0)
    })
  })

  it('shows empty state when no upcoming classes', async () => {
    mockUseInstructorClasses
      .mockReturnValueOnce({ isLoading: false, data: emptyPage } as never)
      .mockReturnValueOnce({ isLoading: false, data: allClassesPage } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('No classes scheduled this week.')).toBeInTheDocument()
    })
  })

  it('renders My Classes section with status badges', async () => {
    mockUseInstructorClasses
      .mockReturnValueOnce({ isLoading: false, data: emptyPage } as never)
      .mockReturnValueOnce({ isLoading: false, data: allClassesPage } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('My Classes')).toBeInTheDocument()
      expect(screen.getByText('Saturday Stretch')).toBeInTheDocument()
      expect(screen.getByText('COMPLETED')).toBeInTheDocument()
    })
  })

  it('shows empty state when instructor has no classes', async () => {
    mockUseInstructorClasses.mockReturnValue({ isLoading: false, data: emptyPage } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('You have no assigned classes.')).toBeInTheDocument()
    })
  })

  it('shows pagination controls in My Classes when totalPages > 1', async () => {
    mockUseInstructorClasses
      .mockReturnValueOnce({ isLoading: false, data: emptyPage } as never)
      .mockReturnValueOnce({ isLoading: false, data: multiPage } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument()
    })
  })

  it('navigates to class detail when a My Classes card is clicked', async () => {
    mockUseInstructorClasses
      .mockReturnValueOnce({ isLoading: false, data: emptyPage } as never)
      .mockReturnValueOnce({ isLoading: false, data: allClassesPage } as never)

    renderPage()

    await waitFor(() =>
      expect(screen.getByText('Saturday Stretch')).toBeInTheDocument()
    )

    await userEvent.click(screen.getByText('Saturday Stretch'))

    await waitFor(() => {
      expect(screen.getByText('Class Detail')).toBeInTheDocument()
    })
  })
})
