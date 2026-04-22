import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminClassListPage from './AdminClassListPage'

vi.mock('../hooks/useAdminClasses', () => ({
  useAdminClasses: vi.fn(),
}))

vi.mock('../hooks/useClassCategories', () => ({
  useClassCategories: vi.fn(),
}))

import { useAdminClasses } from '../hooks/useAdminClasses'
import { useClassCategories } from '../hooks/useClassCategories'

const mockUseAdminClasses = vi.mocked(useAdminClasses)
const mockUseClassCategories = vi.mocked(useClassCategories)

const categories = [
  { id: 'cat_1', name: 'Yoga' },
  { id: 'cat_2', name: 'Pilates' },
]

const classes = [
  {
    id: 'class_1',
    title: 'Morning Vinyasa Flow',
    categoryId: 'cat_1',
    instructorId: 'user_1',
    capacity: 15,
    enrolledCount: 8,
    startsAt: '2025-04-28T07:00:00.000Z',
    durationMinutes: 60,
    location: 'Studio A',
    status: 'ACTIVE',
    classNumber: 1,
    description: null,
  },
  {
    id: 'class_2',
    title: 'Core Strength',
    categoryId: 'cat_2',
    instructorId: 'user_2',
    capacity: 10,
    enrolledCount: 0,
    startsAt: '2025-04-29T09:00:00.000Z',
    durationMinutes: 45,
    location: null,
    status: 'DRAFT',
    classNumber: 2,
    description: null,
  },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/classes']}>
        <Routes>
          <Route path="/admin/classes" element={<AdminClassListPage />} />
          <Route path="/admin" element={<p>Admin Dashboard</p>} />
          <Route path="/admin/classes/new" element={<p>New Class</p>} />
          <Route path="/admin/classes/:id" element={<p>Edit Class</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminClassListPage', () => {
  const defaultPageData = { data: classes, total: 2, page: 1, totalPages: 1 }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAdminClasses.mockReturnValue({ isLoading: false, data: defaultPageData } as never)
    mockUseClassCategories.mockReturnValue({ isLoading: false, data: categories } as never)
  })

  it('renders the list of classes', () => {
    renderPage()
    expect(screen.getByText('Morning Vinyasa Flow')).toBeInTheDocument()
    expect(screen.getByText('Core Strength')).toBeInTheDocument()
  })

  it('shows a skeleton while loading', () => {
    mockUseAdminClasses.mockReturnValue({ isLoading: true, data: undefined } as never)
    renderPage()
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('resolves and displays the category name from categoryId', () => {
    renderPage()
    expect(screen.getByText('Yoga')).toBeInTheDocument()
    expect(screen.getByText('Pilates')).toBeInTheDocument()
  })

  it('renders Edit links pointing to the class edit page', () => {
    renderPage()
    expect(screen.getByTestId('edit-class_1')).toHaveAttribute('href', '/admin/classes/class_1')
    expect(screen.getByTestId('edit-class_2')).toHaveAttribute('href', '/admin/classes/class_2')
  })

  it('renders a New Class link', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /new class/i })).toHaveAttribute('href', '/admin/classes/new')
  })

  it('passes the selected status to useAdminClasses', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Draft' }))
    expect(mockUseAdminClasses).toHaveBeenCalledWith(expect.objectContaining({ status: 'DRAFT' }))
  })

  it('resets to page 1 when status filter changes', async () => {
    mockUseAdminClasses.mockReturnValue({
      isLoading: false,
      data: { data: classes, total: 40, page: 2, totalPages: 2 },
    } as never)
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByRole('button', { name: 'Draft' }))
    expect(mockUseAdminClasses).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
  })

  it('shows pagination when there are multiple pages', () => {
    mockUseAdminClasses.mockReturnValue({
      isLoading: false,
      data: { data: classes, total: 40, page: 1, totalPages: 4 },
    } as never)
    renderPage()
    expect(screen.getByText('Page 1 of 4')).toBeInTheDocument()
  })
})
