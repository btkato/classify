import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import InstructorClassListPage from './InstructorClassListPage'

vi.mock('../hooks/useInstructorClasses', () => ({
  useInstructorClasses: vi.fn(),
}))

import { useInstructorClasses } from '../hooks/useInstructorClasses'

const mockUseInstructorClasses = vi.mocked(useInstructorClasses)

const activeClass = {
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

const completedClass = {
  ...activeClass,
  id: 'class_2',
  title: 'Saturday Stretch',
  status: 'COMPLETED',
}

const emptyPage = { data: [], total: 0, page: 1, totalPages: 0 }
const allPage = { data: [activeClass, completedClass], total: 2, page: 1, totalPages: 1 }
const activePage = { data: [activeClass], total: 1, page: 1, totalPages: 1 }
const multiPage = { data: [activeClass], total: 15, page: 1, totalPages: 2 }

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/instructor/classes']}>
        <Routes>
          <Route path="/instructor/classes" element={<InstructorClassListPage />} />
          <Route path="/instructor/classes/:id" element={<p>Class Detail</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('InstructorClassListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state while data is fetching', () => {
    mockUseInstructorClasses.mockReturnValue({ isLoading: true, data: undefined } as never)

    renderPage()

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('renders class cards when loaded', async () => {
    mockUseInstructorClasses.mockReturnValue({ isLoading: false, data: allPage } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Morning Yoga')).toBeInTheDocument()
      expect(screen.getByText('Saturday Stretch')).toBeInTheDocument()
    })
  })

  it('shows empty state when no classes match', async () => {
    mockUseInstructorClasses.mockReturnValue({ isLoading: false, data: emptyPage } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('No classes match this filter.')).toBeInTheDocument()
    })
  })

  it('renders status filter buttons', async () => {
    mockUseInstructorClasses.mockReturnValue({ isLoading: false, data: allPage } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancelled' })).toBeInTheDocument()
    })
  })

  it('passes status filter to the hook when a filter is selected', async () => {
    mockUseInstructorClasses.mockReturnValue({ isLoading: false, data: activePage } as never)

    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Active' })).toBeInTheDocument()
    )

    await userEvent.click(screen.getByRole('button', { name: 'Active' }))

    expect(mockUseInstructorClasses).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE' })
    )
  })

  it('shows pagination controls when totalPages > 1', async () => {
    mockUseInstructorClasses.mockReturnValue({ isLoading: false, data: multiPage } as never)

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument()
    })
  })

  it('passes search to the hook when Search button is clicked', async () => {
    mockUseInstructorClasses.mockReturnValue({ isLoading: false, data: allPage } as never)

    renderPage()

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Search classes...')).toBeInTheDocument()
    )

    await userEvent.type(screen.getByPlaceholderText('Search classes...'), 'yoga')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(mockUseInstructorClasses).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'yoga' })
    )
  })

  it('does not pass search to the hook before the Search button is clicked', async () => {
    mockUseInstructorClasses.mockReturnValue({ isLoading: false, data: allPage } as never)

    renderPage()

    await waitFor(() =>
      expect(screen.getByPlaceholderText('Search classes...')).toBeInTheDocument()
    )

    await userEvent.type(screen.getByPlaceholderText('Search classes...'), 'yoga')

    expect(mockUseInstructorClasses).not.toHaveBeenCalledWith(
      expect.objectContaining({ search: 'yoga' })
    )
  })

  it('navigates to class detail when a card is clicked', async () => {
    mockUseInstructorClasses.mockReturnValue({ isLoading: false, data: allPage } as never)

    renderPage()

    await waitFor(() =>
      expect(screen.getByText('Morning Yoga')).toBeInTheDocument()
    )

    await userEvent.click(screen.getByText('Morning Yoga'))

    await waitFor(() => {
      expect(screen.getByText('Class Detail')).toBeInTheDocument()
    })
  })
})
