import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useClass } from '../hooks/useClass'
import { useAdminUpdateClass } from '../hooks/useAdminUpdateClass'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Skeleton } from '../components/ui/skeleton'

function toDatetimeLocal(iso: string) {
  return new Date(iso).toISOString().slice(0, 16)
}

export default function AdminClassEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: classDetail, isLoading } = useClass(id ?? '')
  const updateClass = useAdminUpdateClass(id ?? '')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(0)
  const [capacity, setCapacity] = useState(0)
  const [location, setLocation] = useState('')

  useEffect(() => {
    if (classDetail) {
      setTitle(classDetail.title)
      setDescription(classDetail.description ?? '')
      setStartsAt(toDatetimeLocal(classDetail.startsAt))
      setDurationMinutes(classDetail.durationMinutes)
      setCapacity(classDetail.capacity)
      setLocation(classDetail.location ?? '')
    }
  }, [classDetail])

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-3xl" data-testid="loading-skeleton">
        <Skeleton className="h-4 w-32" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </main>
    )
  }

  if (!classDetail) {
    return (
      <main className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Class not found.</p>
      </main>
    )
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    updateClass.mutate(
      {
        title,
        description: description || undefined,
        startsAt: startsAt || undefined,
        durationMinutes,
        capacity,
        location: location || undefined,
      },
      { onSuccess: () => navigate('/admin/classes') }
    )
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/admin/classes" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Classes
      </Link>

      <h1 className="mt-6 text-2xl font-bold">Edit Class</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline gap-1.5">
            <Label htmlFor="description">Description</Label>
            <span className="text-muted-foreground text-xs">(optional)</span>
          </div>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="startsAt">Date & Time</Label>
            <Input
              id="startsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="durationMinutes">Duration (min)</Label>
            <Input
              id="durationMinutes"
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="capacity">Capacity</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
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
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button asChild variant="outline">
            <Link to="/admin/classes">Cancel</Link>
          </Button>
          <Button type="submit" disabled={updateClass.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </main>
  )
}
