import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useCreateLessonSet } from '../hooks/useCreateLessonSet'
import { useClassCategories } from '../hooks/useClassCategories'
import { useInstructors } from '../hooks/useInstructors'
import { useDebounce } from '../hooks/useDebounce'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
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

export default function AdminLessonSetFormPage() {
  const navigate = useNavigate()
  const createLessonSet = useCreateLessonSet()
  const { data: categories } = useClassCategories()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [enrollmentType, setEnrollmentType] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [totalSessions, setTotalSessions] = useState('')
  const [capacity, setCapacity] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [firstSessionStartsAt, setFirstSessionStartsAt] = useState('')
  const [intervalDays, setIntervalDays] = useState('')
  const [location, setLocation] = useState('')
  const [instructorId, setInstructorId] = useState<string | undefined>(undefined)
  const [comboboxOpen, setComboboxOpen] = useState(false)
  const [comboboxSearch, setComboboxSearch] = useState('')

  const debouncedSearch = useDebounce(comboboxSearch, 200)
  const { data: instructors } = useInstructors(debouncedSearch || undefined)
  const selectedInstructor = instructors?.find((instructor) => instructor.id === instructorId)

  function handleCreate(status: 'DRAFT' | 'ACTIVE') {
    createLessonSet.mutate(
      {
        title,
        description: description || undefined,
        enrollmentType,
        categoryId,
        totalSessions: Number(totalSessions),
        capacity: Number(capacity),
        durationMinutes: Number(durationMinutes),
        firstSessionStartsAt,
        intervalDays: Number(intervalDays),
        location: location || undefined,
        instructorId,
        status,
      },
      { onSuccess: () => navigate('/admin/lesson-sets') }
    )
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/admin/lesson-sets" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Lesson Sets
      </Link>

      <h1 className="mt-6 text-2xl font-bold">New Lesson Set</h1>

      <form className="mt-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="e.g. Beginner Yoga Series"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select onValueChange={setCategoryId} required>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="enrollmentType">Enrollment Type</Label>
            <Select onValueChange={setEnrollmentType} required>
              <SelectTrigger id="enrollmentType">
                <SelectValue placeholder="Select enrollment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL_SET">Full Set</SelectItem>
                <SelectItem value="DROP_IN">Drop In</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>
            Instructor <span className="text-muted-foreground font-normal text-xs">(optional)</span>
          </Label>
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
                  : 'Select instructor…'}
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
          <div className="flex items-baseline gap-1.5">
            <Label htmlFor="description">Description</Label>
            <span className="text-muted-foreground text-xs">(optional)</span>
          </div>
          <Textarea
            id="description"
            placeholder="What should students expect from this series?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="totalSessions">Total Sessions</Label>
            <Input
              id="totalSessions"
              type="number"
              placeholder="6"
              min={1}
              value={totalSessions}
              onChange={(e) => setTotalSessions(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              type="number"
              placeholder="15"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="durationMinutes">Duration (min)</Label>
            <Input
              id="durationMinutes"
              type="number"
              placeholder="60"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstSessionStartsAt">First Session Date & Time</Label>
            <Input
              id="firstSessionStartsAt"
              type="datetime-local"
              value={firstSessionStartsAt}
              onChange={(e) => setFirstSessionStartsAt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="intervalDays">Interval (days)</Label>
            <Input
              id="intervalDays"
              type="number"
              placeholder="7"
              min={1}
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline gap-1.5">
            <Label htmlFor="location">Location</Label>
            <span className="text-muted-foreground text-xs">(optional)</span>
          </div>
          <Input
            id="location"
            placeholder="e.g. Studio A, Room 2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button asChild variant="outline">
            <Link to="/admin/lesson-sets">Cancel</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={createLessonSet.isPending}
            onClick={() => handleCreate('DRAFT')}
          >
            Save as draft
          </Button>
          <Button
            type="button"
            disabled={createLessonSet.isPending}
            onClick={() => handleCreate('ACTIVE')}
          >
            Publish
          </Button>
        </div>
      </form>
    </main>
  )
}
