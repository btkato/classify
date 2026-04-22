import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ClassListPage from './ClassListPage'
import { apiFetch } from '../lib/api'

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}))

const mockApiFetch = vi.mocked(apiFetch)

const mockCategories = [
  { id: 'cat_1', name: 'Yoga' },
  { id: 'cat_2', name: 'Pilates' },
]

const mockClasses = [
  {
    id: 'cls_1',
    title: 'Morning Yoga',
    description: 'A relaxing morning session',
    categoryId: 'cat_1',
    instructorId: 'user_1',
    capacity: 10,
    startsAt: '2026-05-01T09:00:00.000Z',
    durationMinutes: 60,
    location: 'Studio A',
    status: 'ACTIVE',
    classNumber: 1,
  },
  {
    id: 'cls_2',
    title: 'Core Pilates',
    description: null,
    categoryId: 'cat_2',
    instructorId: 'user_2',
    capacity: 8,
    startsAt: '2026-05-01T11:00:00.000Z',
    durationMinutes: 45,
    location: null,
    status: 'ACTIVE',
    classNumber: 2,
  },
]

function mockClassPage(classes: typeof mockClasses) {
  return { data: classes, total: classes.length, page: 1, totalPages: 1 }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ClassListPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ClassListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading state while data is fetching', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders category filter buttons once categories load', async () => {
    mockApiFetch
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockClassPage(mockClasses))

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Yoga' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pilates' })).toBeInTheDocument()
    })
  })

  it('renders class cards once classes load', async () => {
    mockApiFetch
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockClassPage(mockClasses))

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Morning Yoga')).toBeInTheDocument()
      expect(screen.getByText('Core Pilates')).toBeInTheDocument()
    })
  })

  it('calls the API with categoryId when a category filter is clicked', async () => {
    mockApiFetch
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockClassPage(mockClasses))
      .mockResolvedValueOnce(mockClassPage([mockClasses[0]!]))

    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Yoga' })).toBeInTheDocument()
    )

    await userEvent.click(screen.getByRole('button', { name: 'Yoga' }))

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        expect.stringContaining('categoryId=cat_1')
      )
    })
  })

  it('shows all classes when All is clicked after a category filter', async () => {
    mockApiFetch
      .mockResolvedValueOnce(mockCategories)
      .mockResolvedValueOnce(mockClassPage(mockClasses))
      .mockResolvedValueOnce(mockClassPage([mockClasses[0]!]))

    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Yoga' })).toBeInTheDocument()
    )

    await userEvent.click(screen.getByRole('button', { name: 'Yoga' }))
    await userEvent.click(screen.getByRole('button', { name: 'All' }))

    await waitFor(() => {
      expect(screen.getByText('Morning Yoga')).toBeInTheDocument()
      expect(screen.getByText('Core Pilates')).toBeInTheDocument()
    })
  })
})
