import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminCategoryPage from './AdminCategoryPage'

vi.mock('../hooks/useClassCategories', () => ({
  useClassCategories: vi.fn(),
}))

vi.mock('../hooks/useCreateCategory', () => ({
  useCreateCategory: vi.fn(),
}))

vi.mock('../hooks/useDeleteCategory', () => ({
  useDeleteCategory: vi.fn(),
}))

import { useClassCategories } from '../hooks/useClassCategories'
import { useCreateCategory } from '../hooks/useCreateCategory'
import { useDeleteCategory } from '../hooks/useDeleteCategory'

const mockUseClassCategories = vi.mocked(useClassCategories)
const mockUseCreateCategory = vi.mocked(useCreateCategory)
const mockUseDeleteCategory = vi.mocked(useDeleteCategory)

const categories = [
  { id: 'cat_1', name: 'Yoga' },
  { id: 'cat_2', name: 'Pilates' },
]

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/categories']}>
        <Routes>
          <Route path="/admin/categories" element={<AdminCategoryPage />} />
          <Route path="/admin" element={<p>Admin Dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminCategoryPage', () => {
  const mockCreateMutate = vi.fn()
  const mockDeleteMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseClassCategories.mockReturnValue({ isLoading: false, data: categories } as never)
    mockUseCreateCategory.mockReturnValue({ mutate: mockCreateMutate, isPending: false } as never)
    mockUseDeleteCategory.mockReturnValue({ mutate: mockDeleteMutate, isPending: false } as never)
  })

  it('renders the list of categories', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Yoga')).toBeInTheDocument()
      expect(screen.getByText('Pilates')).toBeInTheDocument()
    })
  })

  it('shows a skeleton while categories are loading', () => {
    mockUseClassCategories.mockReturnValue({ isLoading: true, data: undefined } as never)
    renderPage()

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('calls createCategory with the input value on form submit', async () => {
    renderPage()

    await userEvent.type(screen.getByPlaceholderText('New category name'), 'Spin')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    expect(mockCreateMutate).toHaveBeenCalledWith('Spin', expect.objectContaining({ onSuccess: expect.any(Function) }))
  })

  it('opens the delete confirmation dialog when Delete is clicked', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByTestId('delete-cat_1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('delete-cat_1'))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/"Yoga"/)).toBeInTheDocument()
  })

  it('closes the dialog without deleting when Cancel is clicked', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByTestId('delete-cat_1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('delete-cat_1'))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mockDeleteMutate).not.toHaveBeenCalled()
  })

  it('calls deleteCategory with the category id when deletion is confirmed', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByTestId('delete-cat_1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('delete-cat_1'))
    await userEvent.click(screen.getByRole('button', { name: 'Delete category' }))

    expect(mockDeleteMutate).toHaveBeenCalledWith('cat_1', expect.objectContaining({ onSuccess: expect.any(Function) }))
  })
})
