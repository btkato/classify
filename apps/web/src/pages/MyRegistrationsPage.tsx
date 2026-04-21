import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { useMyRegistrations } from '../hooks/useMyRegistrations'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { apiFetch } from '../lib/api'
import type { RegistrationWithClass } from '../lib/types'

type Tab = 'upcoming' | 'past'

function isUpcoming(reg: RegistrationWithClass): boolean {
  const startsAt = new Date(reg.class.startsAt).getTime()
  return (
    (reg.status === 'ENROLLED' || reg.status === 'WAITLISTED') &&
    startsAt > Date.now()
  )
}

export default function MyRegistrationsPage() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const { data: registrations, isLoading } = useMyRegistrations()

  const [tab, setTab] = useState<Tab>('upcoming')
  const [search, setSearch] = useState('')

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      return apiFetch(`/registrations/${id}`, token ?? undefined, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
    },
  })

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </main>
    )
  }

  const allRegistrations = registrations ?? []

  const tabFiltered = allRegistrations.filter((reg) =>
    tab === 'upcoming' ? isUpcoming(reg) : !isUpcoming(reg)
  )

  const displayed = search.trim()
    ? tabFiltered.filter((reg) =>
        reg.class.title.toLowerCase().includes(search.trim().toLowerCase())
      )
    : tabFiltered

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">My Registrations</h1>

      <div className="mt-6 flex gap-3">
        <input
          type="text"
          placeholder="Search by class name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button variant="outline">More Filters</Button>
      </div>

      <div className="mt-5 flex border-b border-border">
        <button
          onClick={() => setTab('upcoming')}
          className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
            tab === 'upcoming'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setTab('past')}
          className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
            tab === 'past'
              ? 'border-foreground text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Past
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {displayed.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tab === 'upcoming' ? (
              <>
                No upcoming registrations.{' '}
                <Link to="/classes" className="underline text-foreground">
                  Browse classes
                </Link>
              </>
            ) : (
              'No past registrations.'
            )}
          </p>
        ) : (
          displayed.map((reg) => {
            const date = new Date(reg.class.startsAt).toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })

            const canCancel = reg.status === 'ENROLLED' || reg.status === 'WAITLISTED'

            return (
              <Card key={reg.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{reg.class.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {date} · {reg.class.durationMinutes} min
                      {reg.class.location ? ` · ${reg.class.location}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={reg.status === 'WAITLISTED' ? 'outline' : 'secondary'}>
                      {reg.status === 'WAITLISTED'
                        ? `Waitlist #${reg.waitlistPosition}`
                        : reg.status.charAt(0) + reg.status.slice(1).toLowerCase()}
                    </Badge>
                    {canCancel && (
                      <button
                        onClick={() => cancelMutation.mutate(reg.id)}
                        disabled={cancelMutation.isPending}
                        className="text-sm font-medium text-destructive hover:opacity-75 disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </main>
  )
}
