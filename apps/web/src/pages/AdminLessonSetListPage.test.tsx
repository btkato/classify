import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminLessonSetListPage from './AdminLessonSetListPage'

vi.mock('../hooks/useLessonSets', () => ({ useLessonSets: vi.fn() }))

import { useLessonSets } from '../hooks/useLessonSets'

const mockUseLessonSets = vi.mocked(useLessonSets)

const lessonSets = [
  {
    id: 'ls_1',
    title: 'Beginner Yoga Series',
    enrollmentType: 'FULL_SET',
    totalSessions: 6,
    status: 'ACTIVE',
    instructorId: 'user_1',
    categoryId: 'cat_1',
    description: null,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'ls_2',
    title: 'Core Pilates Drop-In',
    enrollmentType: 'DROP_IN',
    totalSessions: 4,
    status: 'DRAFT',
    instructorId: 'user_2',
    categoryId: 'cat_2',
    description: null,
    createdAt: '',
    updatedAt: '',
  },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/lesson-sets']}>
        <Routes>
          <Route path="/admin/lesson-sets" element={<AdminLessonSetListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminLessonSetListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseLessonSets.mockReturnValue({ data: lessonSets, isLoading: false } as never)
  })

  it('shows skeleton while loading', () => {
    mockUseLessonSets.mockReturnValue({ data: undefined, isLoading: true } as never)
    renderPage()
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('renders lesson set titles in the table', () => {
    renderPage()
    expect(screen.getByText('Beginner Yoga Series')).toBeInTheDocument()
    expect(screen.getByText('Core Pilates Drop-In')).toBeInTheDocument()
  })

  it('renders enrollment type and session count', () => {
    renderPage()
    expect(screen.getByText('Full Set')).toBeInTheDocument()
    expect(screen.getByText('Drop-in')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('renders an edit link for each row', () => {
    renderPage()
    expect(screen.getByTestId('edit-ls_1')).toHaveAttribute('href', '/admin/lesson-sets/ls_1')
    expect(screen.getByTestId('edit-ls_2')).toHaveAttribute('href', '/admin/lesson-sets/ls_2')
  })

  it('renders a new lesson set link', () => {
    renderPage()
    expect(screen.getByRole('link', { name: '+ New Lesson Set' })).toHaveAttribute(
      'href',
      '/admin/lesson-sets/new'
    )
  })
})
