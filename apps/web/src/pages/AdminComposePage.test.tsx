import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminComposePage from './AdminComposePage'

vi.mock('../hooks/useInstructors', () => ({ useInstructors: vi.fn() }))
vi.mock('../hooks/useCreateDirectMessage', () => ({ useCreateDirectMessage: vi.fn() }))
vi.mock('../hooks/useDebounce', () => ({ useDebounce: (value: string) => value }))

import { useInstructors } from '../hooks/useInstructors'
import { useCreateDirectMessage } from '../hooks/useCreateDirectMessage'

const mockUseInstructors = vi.mocked(useInstructors)
const mockUseCreateDirectMessage = vi.mocked(useCreateDirectMessage)

const instructors = [
  { id: 'user_instructor_1', firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com', roles: [] },
  { id: 'user_instructor_2', firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com', roles: [] },
]

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/inbox/compose']}>
        <Routes>
          <Route path="/inbox" element={<p>Inbox</p>} />
          <Route path="/inbox/compose" element={<AdminComposePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminComposePage', () => {
  const mockMutate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseInstructors.mockReturnValue({ data: instructors } as never)
    mockUseCreateDirectMessage.mockReturnValue({ mutate: mockMutate, isPending: false } as never)
  })

  it('renders the instructor combobox and message textarea', () => {
    renderPage()

    expect(screen.getByTestId('instructor-combobox')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/write your message/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
  })

  it('sends a direct message to the selected instructor', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByTestId('instructor-combobox'))
    await user.click(screen.getByText('Jane Smith'))
    await user.type(screen.getByPlaceholderText(/write your message/i), 'Hello Jane')
    await user.click(screen.getByRole('button', { name: /send message/i }))

    expect(mockMutate).toHaveBeenCalledWith(
      { instructorId: 'user_instructor_1', body: 'Hello Jane' },
      expect.any(Object)
    )
  })

  it('navigates to /inbox on successful send', async () => {
    mockUseCreateDirectMessage.mockReturnValue({
      mutate: (_input: unknown, options: { onSuccess?: () => void }) => {
        options.onSuccess?.()
      },
      isPending: false,
    } as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByTestId('instructor-combobox'))
    await user.click(screen.getByText('Jane Smith'))
    await user.type(screen.getByPlaceholderText(/write your message/i), 'Hello Jane')
    await user.click(screen.getByRole('button', { name: /send message/i }))

    expect(screen.getByText('Inbox')).toBeInTheDocument()
  })
})
