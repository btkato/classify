import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useClass } from '../hooks/useClass'
import { useMyRegistrations } from '../hooks/useMyRegistrations'
import { useEnroll } from '../hooks/useEnroll'
import { useCancelRegistration } from '../hooks/useCancelRegistration'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import type { Class } from '../lib/types'

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { isSignedIn } = useAuth()
  const { data: classDetail, isLoading } = useClass(id ?? '')
  const { data: registrations } = useMyRegistrations()
  const { mutate: enroll } = useEnroll(id ?? '')
  const { mutate: cancelRegistration } = useCancelRegistration()

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Link to="/classes" className="mb-6 inline-block text-sm text-muted-foreground hover:text-foreground">
          ← Back to Classes
        </Link>
        <div data-testid="loading-skeleton" className="mx-auto max-w-2xl mt-6 space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-4 h-32 w-full" />
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

  const existingRegistration = (registrations ?? []).find(
    (registration) =>
      registration.classId === classDetail.id &&
      (registration.status === 'ENROLLED' || registration.status === 'WAITLISTED')
  )

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

  function renderEnrollmentButton(detail: Class) {
    if (!isSignedIn) {
      return (
        <Button className="w-full" onClick={handleGuestEnroll}>
          Sign in to enroll
        </Button>
      )
    }

    if (existingRegistration?.status === 'ENROLLED') {
      return (
        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            cancelRegistration({ registrationId: existingRegistration.id, classId: detail.id })
          }
        >
          Cancel enrollment
        </Button>
      )
    }

    if (existingRegistration?.status === 'WAITLISTED') {
      return (
        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            cancelRegistration({ registrationId: existingRegistration.id, classId: detail.id })
          }
        >
          Cancel waitlist position
        </Button>
      )
    }

    if (isFull) {
      return (
        <Button variant="outline" className="w-full" onClick={() => enroll()}>
          Join Waitlist
        </Button>
      )
    }

    return (
      <Button className="w-full" onClick={() => enroll()}>
        Enroll
      </Button>
    )
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
          <CardContent className="pt-6">{renderEnrollmentButton(classDetail)}</CardContent>
        </Card>
      </div>
    </main>
  )
}
