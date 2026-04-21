import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useClass } from '../hooks/useClass'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { isSignedIn } = useAuth()
  const { data: classDetail, isLoading } = useClass(id ?? '')

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

  const isFull = classDetail.enrolledCount >= classDetail.capacity

  const date = new Date(classDetail.startsAt).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  function handleGuestEnroll() {
    navigate('/sign-in', { state: { from: { pathname: location.pathname } } })
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <Link
        to="/classes"
        className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Classes
      </Link>

      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">{classDetail.title}</h1>

        {classDetail.description && (
          <p className="mt-2 text-muted-foreground">{classDetail.description}</p>
        )}

        <div className="mt-3 flex gap-2">
          <Badge variant="secondary">{classDetail.status}</Badge>
        </div>

        <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
          <span>{date}</span>
          <span>{classDetail.durationMinutes} min</span>
          {classDetail.location && <span>{classDetail.location}</span>}
          <span>
            {classDetail.enrolledCount} / {classDetail.capacity} spots filled
          </span>
        </div>

        <Card className="mt-8">
          <CardContent className="pt-6">
            {!isSignedIn ? (
              <Button className="w-full" onClick={handleGuestEnroll}>
                Sign in to enroll
              </Button>
            ) : (
              <Button variant={isFull ? 'outline' : 'default'} className="w-full">
                {isFull ? 'Join Waitlist' : 'Enroll'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
