import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useClass } from '../hooks/useClass'
import { useUpdateClass } from '../hooks/useUpdateClass'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'

export default function InstructorClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: classDetail, isLoading } = useClass(id ?? '')
  const updateClass = useUpdateClass(id ?? '')

  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')

  useEffect(() => {
    if (classDetail) {
      setDescription(classDetail.description ?? '')
      setLocation(classDetail.location ?? '')
    }
  }, [classDetail])

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <p>Loading...</p>
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

  const date = new Date(classDetail.startsAt).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    updateClass.mutate({ description: description || undefined, location: location || undefined })
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <Link
        to="/instructor/classes"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to My Classes
      </Link>

      <div className="mt-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{classDetail.title}</h1>
          <Badge variant="secondary">{classDetail.status}</Badge>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <span>{date} · {classDetail.durationMinutes} min</span>
          {classDetail.location && <span>{classDetail.location}</span>}
          <span>{classDetail.enrolledCount} / {classDetail.capacity} enrolled</span>
        </div>

        <Button asChild variant="outline" className="mt-4">
          <Link to={`/instructor/classes/${classDetail.id}/roster`}>View Roster</Link>
        </Button>
      </div>

      <hr className="my-8 border-border" />

      <div>
        <h2 className="text-lg font-semibold">Edit Class</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You can update the description and location.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              placeholder="Add a description..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-foreground/40 bg-background"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="location" className="text-sm font-medium">
              Location
            </label>
            <input
              id="location"
              type="text"
              placeholder="Add a location..."
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-foreground/40 bg-background"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={updateClass.isPending}>
              Save Changes
            </Button>
            {updateClass.isSuccess && (
              <span className="text-sm text-muted-foreground">Changes saved.</span>
            )}
          </div>
        </form>
      </div>
    </main>
  )
}
