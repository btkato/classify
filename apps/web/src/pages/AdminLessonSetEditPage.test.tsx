import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminLessonSetEditPage from './AdminLessonSetEditPage'

vi.mock('../hooks/useLessonSet', () => ({ useLessonSet: vi.fn() }))
vi.mock('../hooks/useUpdateLessonSet', () => ({ useUpdateLessonSet: vi.fn() }))
vi.mock('../hooks/useDeleteClass', () => ({ useDeleteClass: vi.fn() }))
vi.mock('../hooks/useDeleteLessonSet', () => ({ useDeleteLessonSet: vi.fn() }))

import { useLessonSet } from '../hooks/useLessonSet'
import { useUpdateLessonSet } from '../hooks/useUpdateLessonSet'
import { useDeleteClass } from '../hooks/useDeleteClass'
import { useDeleteLessonSet } from '../hooks/useDeleteLessonSet'

const mockUseLessonSet = vi.mocked(useLessonSet)
const mockUseUpdateLessonSet = vi.mocked(useUpdateLessonSet)
const mockUseDeleteClass = vi.mocked(useDeleteClass)
const mockUseDeleteLessonSet = vi.mocked(useDeleteLessonSet)

const lessonSet = {
  id: 'ls_1',
  title: 'Beginner Yoga Series',
  description: 'A gentle introduction',
  enrollmentType: 'FULL_SET',
  totalSessions: 2,
  status: 'ACTIVE',
  instructorId: 'user_1',
  categoryId: 'cat_1',
  createdAt: '',
  updatedAt: '',
  classes: [
    {
      id: 'class_1',
      title: 'Beginner Yoga Series',
      description: null,
      categoryId: 'cat_1',
      instructorId: 'user_1',
      capacity: 15,
      enrolledCount: 0,
      startsAt: '2025-06-01T10:00:00.000Z',
      durationMinutes: 60,
      location: null,
      status: 'ACTIVE',
      classNumber: 1,
      sessionNumber: 1,
    },
    {
      id: 'class_2',
      title: 'Beginner Yoga Series',
      description: null,
      categoryId: 'cat_1',
      instructorId: 'user_1',
      capacity: 15,
      enrolledCount: 0,
      startsAt: '2025-06-08T10:00:00.000Z',
      durationMinutes: 60,
      location: null,
      status: 'ACTIVE',
      classNumber: 2,
      sessionNumber: 2,
    },
  ],
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
  const mockUpdateMutate = vi.fn()
  const mockDeleteClassMutate = vi.fn()
  const mockDeleteLessonSetMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseLessonSet.mockReturnValue({ data: lessonSet, isLoading: false } as never)
    mockUseUpdateLessonSet.mockReturnValue({ mutate: mockUpdateMutate, isPending: false } as never)
    mockUseDeleteClass.mockReturnValue({ mutate: mockDeleteClassMutate, isPending: false } as never)
    mockUseDeleteLessonSet.mockReturnValue({ mutate: mockDeleteLessonSetMutate, isPending: false } as never)
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
      expect(mockUpdateMutate).toHaveBeenCalledWith(
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

  it('shows a session list with session number and status for each class', () => {
    renderPage()
    expect(screen.getByText('Session 1')).toBeInTheDocument()
    expect(screen.getByText('Session 2')).toBeInTheDocument()
  })

  it('each session row has an edit link to /admin/classes/:id', () => {
    renderPage()
    const editLinks = screen.getAllByRole('link', { name: 'Edit' })
    expect(editLinks[0]).toHaveAttribute('href', '/admin/classes/class_1')
    expect(editLinks[1]).toHaveAttribute('href', '/admin/classes/class_2')
  })

  it('clicking Delete on a session opens a confirmation dialog', async () => {
    renderPage()
    await userEvent.click(screen.getByTestId('delete-session-class_1'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /delete session/i })).toBeInTheDocument()
  })

  it('confirming session delete calls deleteClass mutate with the class id', async () => {
    renderPage()
    await userEvent.click(screen.getByTestId('delete-session-class_1'))
    await userEvent.click(screen.getByRole('button', { name: 'Delete session' }))
    expect(mockDeleteClassMutate).toHaveBeenCalledWith(
      'class_1',
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('Delete lesson set button opens a confirmation dialog', async () => {
    renderPage()
    await userEvent.click(screen.getByTestId('delete-lesson-set'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /delete lesson set/i })).toBeInTheDocument()
  })

  it('confirming delete lesson set calls deleteLessonSet mutate', async () => {
    renderPage()
    await userEvent.click(screen.getByTestId('delete-lesson-set'))
    await userEvent.click(screen.getByRole('button', { name: 'Delete lesson set' }))
    expect(mockDeleteLessonSetMutate).toHaveBeenCalledWith(
      'ls_1',
      expect.objectContaining({ onSuccess: expect.any(Function) })
    )
  })

  it('navigates to /admin/lesson-sets after lesson set is deleted', async () => {
    mockUseDeleteLessonSet.mockReturnValue({
      mutate: vi.fn().mockImplementation((_id, options) => options.onSuccess()),
      isPending: false,
    } as never)

    renderPage()
    await userEvent.click(screen.getByTestId('delete-lesson-set'))
    await userEvent.click(screen.getByRole('button', { name: 'Delete lesson set' }))

    await waitFor(() => expect(screen.getByText('Lesson Sets List')).toBeInTheDocument())
  })
})
