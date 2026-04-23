import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminClassEditPage from './AdminClassEditPage'

vi.mock('../hooks/useClass', () => ({ useClass: vi.fn() }))
vi.mock('../hooks/useAdminUpdateClass', () => ({ useAdminUpdateClass: vi.fn() }))

import { useClass } from '../hooks/useClass'
import { useAdminUpdateClass } from '../hooks/useAdminUpdateClass'

const mockUseClass = vi.mocked(useClass)
const mockUseAdminUpdateClass = vi.mocked(useAdminUpdateClass)

const classDetail = {
  id: 'class_1',
  title: 'Morning Yoga',
  description: 'A gentle flow',
  categoryId: 'cat_1',
  instructorId: 'user_1',
  capacity: 15,
  enrolledCount: 3,
  startsAt: '2025-06-01T10:00:00.000Z',
  durationMinutes: 60,
  location: 'Studio A',
  status: 'ACTIVE',
  classNumber: 1,
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/classes/class_1']}>
        <Routes>
          <Route path="/admin/classes/:id" element={<AdminClassEditPage />} />
          <Route path="/admin/classes" element={<p>Classes List</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminClassEditPage', () => {
  const mockMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseClass.mockReturnValue({ data: classDetail, isLoading: false } as never)
    mockUseAdminUpdateClass.mockReturnValue({ mutate: mockMutate, isPending: false } as never)
  })

  it('shows skeleton while loading', () => {
    mockUseClass.mockReturnValue({ data: undefined, isLoading: true } as never)
    renderPage()
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('pre-populates form fields with class data', () => {
    renderPage()
    expect(screen.getByLabelText('Title')).toHaveValue('Morning Yoga')
    expect(screen.getByLabelText('Duration (min)')).toHaveValue(60)
    expect(screen.getByLabelText('Capacity')).toHaveValue(15)
    expect(screen.getByLabelText('Location')).toHaveValue('Studio A')
  })

  it('renders a cancel link back to /admin/classes', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/admin/classes')
  })

  it('calls mutate with updated fields on submit', async () => {
    renderPage()

    await userEvent.clear(screen.getByLabelText('Title'))
    await userEvent.type(screen.getByLabelText('Title'), 'Evening Yoga')

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Evening Yoga' }),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    )
  })

  it('includes status in the mutate call on submit', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ACTIVE' }),
        expect.any(Object)
      )
    )
  })

  it('navigates to /admin/classes on successful save', async () => {
    mockUseAdminUpdateClass.mockReturnValue({
      mutate: vi.fn().mockImplementation((_data, options) => options.onSuccess()),
      isPending: false,
    } as never)

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.getByText('Classes List')).toBeInTheDocument())
  })
})
