import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useInstructors } from '../hooks/useInstructors'
import { useCreateDirectMessage } from '../hooks/useCreateDirectMessage'
import { useDebounce } from '../hooks/useDebounce'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../components/ui/command'

export default function AdminComposePage() {
  const navigate = useNavigate()
  const createDirectMessage = useCreateDirectMessage()

  const [instructorId, setInstructorId] = useState<string | undefined>(undefined)
  const [body, setBody] = useState('')
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [comboboxSearch, setComboboxSearch] = useState('')

  const debouncedSearch = useDebounce(comboboxSearch, 200)
  const { data: instructors } = useInstructors(debouncedSearch || undefined)
  const selectedInstructor = instructors?.find((instructor) => instructor.id === instructorId)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!instructorId || !body.trim()) return
    createDirectMessage.mutate(
      { instructorId, body },
      { onSuccess: () => navigate('/inbox') }
    )
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/inbox" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Inbox
      </Link>

      <h1 className="mt-6 text-2xl font-bold">New Message</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start a direct conversation with an instructor. If a thread already exists it will be reused.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <Label>To</Label>
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                className="w-full justify-between font-normal"
                data-testid="instructor-combobox"
              >
                {selectedInstructor
                  ? `${selectedInstructor.firstName} ${selectedInstructor.lastName}`
                  : 'Select an instructor…'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search instructors…"
                  value={comboboxSearch}
                  onValueChange={setComboboxSearch}
                />
                <CommandList>
                  <CommandEmpty>No instructors found.</CommandEmpty>
                  <CommandGroup>
                    {instructors?.map((instructor) => (
                      <CommandItem
                        key={instructor.id}
                        value={instructor.id}
                        onSelect={(value) => {
                          setInstructorId(value === instructorId ? undefined : value)
                          setComboboxOpen(false)
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${instructorId === instructor.id ? 'opacity-100' : 'opacity-0'}`}
                        />
                        {instructor.firstName} {instructor.lastName}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="message-body">Message</Label>
          <Textarea
            id="message-body"
            placeholder="Write your message…"
            rows={6}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="submit"
            disabled={!instructorId || !body.trim() || createDirectMessage.isPending}
          >
            Send Message
          </Button>
          <Button asChild variant="ghost">
            <Link to="/inbox">Cancel</Link>
          </Button>
        </div>
      </form>
    </main>
  )
}
