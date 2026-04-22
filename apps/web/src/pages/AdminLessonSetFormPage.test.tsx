import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminLessonSetFormPage from './AdminLessonSetFormPage'

vi.mock('../hooks/useCreateLessonSet', () => ({ useCreateLessonSet: vi.fn() }))
vi.mock('../hooks/useClassCategories', () => ({ useClassCategories: vi.fn() }))
vi.mock('../hooks/useInstructors', () => ({ useInstructors: vi.fn() }))

import { useCreateLessonSet } from '../hooks/useCreateLessonSet'
import { useClassCategories } from '../hooks/useClassCategories'
import { useInstructors } from '../hooks/useInstructors'

const mockUseCreateLessonSet = vi.mocked(useCreateLessonSet)
const mockUseClassCategories = vi.mocked(useClassCategories)
const mockUseInstructors = vi.mocked(useInstructors)

const categories = [
  { id: 'cat_1', name: 'Yoga' },
  { id: 'cat_2', name: 'Pilates' },
]

const instructors = [
  { id: 'user_1', firstName: 'Sarah', lastName: 'Chen', email: 'sarah@example.com', phone: null, createdAt: '', roles: [{ role: 'INSTRUCTOR' }] },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/lesson-sets/new']}>
        <Routes>
          <Route path="/admin/lesson-sets/new" element={<AdminLessonSetFormPage />} />
          <Route path="/admin/lesson-sets" element={<p>Lesson Sets List</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminLessonSetFormPage', () => {
  const mockMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseCreateLessonSet.mockReturnValue({ mutate: mockMutate, isPending: false } as never)
    mockUseClassCategories.mockReturnValue({ data: categories } as never)
    mockUseInstructors.mockReturnValue({ data: instructors } as never)
  })

  it('renders all required form fields', () => {
    renderPage()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Category')).toBeInTheDocument()
    expect(screen.getByLabelText('Enrollment Type')).toBeInTheDocument()
    expect(screen.getByLabelText('Total Sessions')).toBeInTheDocument()
    expect(screen.getByLabelText('Capacity')).toBeInTheDocument()
    expect(screen.getByLabelText('Duration (min)')).toBeInTheDocument()
    expect(screen.getByLabelText('First Session Date & Time')).toBeInTheDocument()
    expect(screen.getByLabelText('Interval (days)')).toBeInTheDocument()
  })

  it('renders a cancel link back to /admin/lesson-sets', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/admin/lesson-sets')
  })

  it('calls mutate with form data on submit', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Title'), 'Morning Yoga Series')
    await userEvent.type(screen.getByLabelText('Total Sessions'), '6')
    await userEvent.type(screen.getByLabelText('Capacity'), '15')
    await userEvent.type(screen.getByLabelText('Duration (min)'), '60')
    await userEvent.type(screen.getByLabelText('First Session Date & Time'), '2025-06-01T09:00')
    await userEvent.type(screen.getByLabelText('Interval (days)'), '7')

    await userEvent.click(screen.getByLabelText('Category'))
    await userEvent.click(await screen.findByRole('option', { name: 'Yoga' }))

    await userEvent.click(screen.getByLabelText('Enrollment Type'))
    await userEvent.click(await screen.findByRole('option', { name: 'Full Set' }))

    await userEvent.click(screen.getByRole('button', { name: 'Create lesson set' }))

    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Morning Yoga Series',
          categoryId: 'cat_1',
          totalSessions: 6,
          capacity: 15,
          durationMinutes: 60,
          intervalDays: 7,
          enrollmentType: 'FULL_SET',
        }),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    )
  })

  it('navigates to /admin/lesson-sets on successful create', async () => {
    mockUseCreateLessonSet.mockReturnValue({
      mutate: vi.fn().mockImplementation((_data, options) => options.onSuccess()),
      isPending: false,
    } as never)

    renderPage()

    await userEvent.type(screen.getByLabelText('Title'), 'Morning Yoga Series')
    await userEvent.type(screen.getByLabelText('Total Sessions'), '6')
    await userEvent.type(screen.getByLabelText('Capacity'), '15')
    await userEvent.type(screen.getByLabelText('Duration (min)'), '60')
    await userEvent.type(screen.getByLabelText('First Session Date & Time'), '2025-06-01T09:00')
    await userEvent.type(screen.getByLabelText('Interval (days)'), '7')

    await userEvent.click(screen.getByLabelText('Category'))
    await userEvent.click(await screen.findByRole('option', { name: 'Yoga' }))

    await userEvent.click(screen.getByLabelText('Enrollment Type'))
    await userEvent.click(await screen.findByRole('option', { name: 'Full Set' }))

    await userEvent.click(screen.getByRole('button', { name: 'Create lesson set' }))

    await waitFor(() => expect(screen.getByText('Lesson Sets List')).toBeInTheDocument())
  })
})
