import { Link, useParams } from 'react-router-dom'
import { useRoster } from '../hooks/useRoster'
import { useClass } from '../hooks/useClass'
import { Badge } from '../components/ui/badge'
import type { RosterEntry } from '../hooks/useRoster'

function RosterRow({ entry }: { entry: RosterEntry }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium">{entry.user.firstName} {entry.user.lastName}</p>
        <p className="text-sm text-muted-foreground">{entry.user.email}</p>
      </div>
      {entry.status === 'WAITLISTED' && entry.waitlistPosition !== null && (
        <span className="text-sm text-muted-foreground font-medium">#{entry.waitlistPosition}</span>
      )}
    </div>
  )
}

export default function InstructorRosterPage() {
  const { id } = useParams<{ id: string }>()
  const { data: classDetail, isLoading: classLoading } = useClass(id ?? '')
  const { data: roster, isLoading: rosterLoading } = useRoster(id ?? '')

  if (classLoading || rosterLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </main>
    )
  }

  const enrolled = (roster ?? []).filter((entry) => entry.status === 'ENROLLED')
  const waitlisted = (roster ?? []).filter((entry) => entry.status === 'WAITLISTED')

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <Link
        to={`/instructor/classes/${id}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to Class
      </Link>

      <h1 className="mt-6 text-2xl font-bold">{classDetail?.title}</h1>

      {roster?.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No students enrolled yet.</p>
      ) : (
        <>
          {enrolled.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Enrolled</h2>
                <Badge variant="secondary">{enrolled.length}</Badge>
              </div>
              <div className="mt-3 border border-border rounded-lg px-4">
                {enrolled.map((entry) => (
                  <RosterRow key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          )}

          {waitlisted.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Waitlist</h2>
                <Badge variant="outline">{waitlisted.length}</Badge>
              </div>
              <div className="mt-3 border border-border rounded-lg px-4">
                {waitlisted.map((entry) => (
                  <RosterRow key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}
