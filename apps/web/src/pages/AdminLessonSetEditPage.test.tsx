import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminLessonSetEditPage from './AdminLessonSetEditPage'

vi.mock('../hooks/useLessonSet', () => ({ useLessonSet: vi.fn() }))
vi.mock('../hooks/useUpdateLessonSet', () => ({ useUpdateLessonSet: vi.fn() }))

import { useLessonSet } from '../hooks/useLessonSet'
import { useUpdateLessonSet } from '../hooks/useUpdateLessonSet'

const mockUseLessonSet = vi.mocked(useLessonSet)
const mockUseUpdateLessonSet = vi.mocked(useUpdateLessonSet)

const lessonSet = {
  id: 'ls_1',
  title: 'Beginner Yoga Series',
  description: 'A gentle introduction',
  enrollmentType: 'FULL_SET',
  totalSessions: 6,
  status: 'ACTIVE',
  instructorId: 'user_1',
  categoryId: 'cat_1',
  createdAt: '',
  updatedAt: '',
  classes: [],
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/lesson-sets/ls_1']}>
        <Routes>
          <Route path="/admin/lesson-sets/:id" element={<AdminLessonSetEditPage />} />
          <Route path="/admin/lesson-sets" element={<p>Lesson Sets List</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminLessonSetEditPage', () => {
  const mockMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseLessonSet.mockReturnValue({ data: lessonSet, isLoading: false } as never)
    mockUseUpdateLessonSet.mockReturnValue({ mutate: mockMutate, isPending: false } as never)
  })

  it('shows skeleton while loading', () => {
    mockUseLessonSet.mockReturnValue({ data: undefined, isLoading: true } as never)
    renderPage()
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('pre-populates form fields with lesson set data', () => {
    renderPage()
    expect(screen.getByLabelText('Title')).toHaveValue('Beginner Yoga Series')
    expect(screen.getByLabelText('Description')).toHaveValue('A gentle introduction')
  })

  it('renders a cancel link back to /admin/lesson-sets', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/admin/lesson-sets')
  })

  it('calls mutate with updated fields on submit', async () => {
    renderPage()

    await userEvent.clear(screen.getByLabelText('Title'))
    await userEvent.type(screen.getByLabelText('Title'), 'Intermediate Yoga Series')

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Intermediate Yoga Series' }),
        expect.objectContaining({ onSuccess: expect.any(Function) })
      )
    )
  })

  it('navigates to /admin/lesson-sets on successful save', async () => {
    mockUseUpdateLessonSet.mockReturnValue({
      mutate: vi.fn().mockImplementation((_data, options) => options.onSuccess()),
      isPending: false,
    } as never)

    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.getByText('Lesson Sets List')).toBeInTheDocument())
  })
})
