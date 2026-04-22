import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminClassFormPage from './AdminClassFormPage'

vi.mock('../hooks/useCreateClass', () => ({ useCreateClass: vi.fn() }))
vi.mock('../hooks/useClassCategories', () => ({ useClassCategories: vi.fn() }))
vi.mock('../hooks/useInstructors', () => ({ useInstructors: vi.fn() }))

import { useCreateClass } from '../hooks/useCreateClass'
import { useClassCategories } from '../hooks/useClassCategories'
import { useInstructors } from '../hooks/useInstructors'

const mockUseCreateClass = vi.mocked(useCreateClass)
const mockUseClassCategories = vi.mocked(useClassCategories)
const mockUseInstructors = vi.mocked(useInstructors)

const categories = [
  { id: 'cat_1', name: 'Yoga' },
  { id: 'cat_2', name: 'Pilates' },
]

const instructors = [
  { id: 'user_1', firstName: 'Sarah', lastName: 'Chen', email: 'sarah@example.com', phone: null, createdAt: '', roles: [{ role: 'INSTRUCTOR' }] },
  { id: 'user_2', firstName: 'Marcus', lastName: 'Webb', email: 'marcus@example.com', phone: null, createdAt: '', roles: [{ role: 'INSTRUCTOR' }] },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/classes/new']}>
        <Routes>
          <Route path="/admin/classes/new" element={<AdminClassFormPage />} />
          <Route path="/admin/classes" element={<p>Classes List</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminClassFormPage', () => {
  const mockMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCreateClass.mockReturnValue({ mutate: mockMutate, isPending: false } as never)
    mockUseClassCategories.mockReturnValue({ data: categories } as never)
    mockUseInstructors.mockReturnValue({ data: instructors } as never)
  })

  it('renders all required form fields', () => {
    renderPage()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Category')).toBeInTheDocument()
    expect(screen.getByLabelText('Date & Time')).toBeInTheDocument()
    expect(screen.getByLabelText('Duration (min)')).toBeInTheDocument()
    expect(screen.getByLabelText('Capacity')).toBeInTheDocument()
  })

  it('renders a cancel link back to /admin/classes', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/admin/classes')
  })

  it('calls mutate with form data on submit', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Title'), 'Morning Yoga')
    await userEvent.type(screen.getByLabelText('Date & Time'), '2025-05-01T10:00')
    await userEvent.type(screen.getByLabelText('Duration (min)'), '60')
    await userEvent.type(screen.getByLabelText('Capacity'), '15')

    await userEvent.click(screen.getByLabelText('Category'))
    await userEvent.click(await screen.findByRole('option', { name: 'Yoga' }))

    await userEvent.click(screen.getByRole('button', { name: 'Create class' }))

    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Morning Yoga',
          categoryId: 'cat_1',
          durationMinutes: 60,
          capacity: 15,
        }),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    )
  })

  it('navigates to /admin/classes on successful create', async () => {
    mockUseCreateClass.mockReturnValue({
      mutate: vi.fn().mockImplementation((_data, options) => options.onSuccess()),
      isPending: false,
    } as never)

    renderPage()

    await userEvent.type(screen.getByLabelText('Title'), 'Morning Yoga')
    await userEvent.type(screen.getByLabelText('Date & Time'), '2025-05-01T10:00')
    await userEvent.type(screen.getByLabelText('Duration (min)'), '60')
    await userEvent.type(screen.getByLabelText('Capacity'), '15')

    await userEvent.click(screen.getByLabelText('Category'))
    await userEvent.click(await screen.findByRole('option', { name: 'Yoga' }))

    await userEvent.click(screen.getByRole('button', { name: 'Create class' }))

    await waitFor(() => expect(screen.getByText('Classes List')).toBeInTheDocument())
  })

  it('shows instructor names in the combobox dropdown', async () => {
    renderPage()
    await userEvent.click(screen.getByTestId('instructor-combobox'))
    await waitFor(() => {
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument()
      expect(screen.getByText('Marcus Webb')).toBeInTheDocument()
    })
  })
})
