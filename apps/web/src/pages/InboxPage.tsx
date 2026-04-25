import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { useInbox } from '../hooks/useInbox'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { Badge } from '../components/ui/badge'
import type { ThreadSummary } from '../lib/types'

function formatSentAt(sentAt: string): string {
  return new Date(sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function InboxPage() {
  const { data: inbox, isLoading } = useInbox()
  const { data: currentUser } = useCurrentUser()

  const isAdmin = currentUser?.roles.some((userRole) => userRole.role === 'ADMIN') ?? false

  function getThreadLabel(thread: ThreadSummary): string {
    if (thread.type === 'ANNOUNCEMENT') {
      return thread.className ?? 'Announcement'
    }
    const other = thread.participants.find((participant) => participant.userId !== currentUser?.id)
    return other ? `${other.user.firstName} ${other.user.lastName}` : 'Direct Message'
  }

  function isUnread(thread: ThreadSummary): boolean {
    const latest = thread.latestMessage
    if (!latest) return false
    return latest.senderId !== currentUser?.id && latest.readAt === null
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your conversations and class announcements.
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link to="/inbox/compose">
              <Pencil className="mr-2 h-4 w-4" />
              Compose
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="divide-y divide-border rounded-lg border border-border bg-white overflow-hidden">
            {[1, 2, 3].map((index) => (
              <div key={index} className="flex items-start gap-4 px-5 py-4" data-testid="thread-skeleton">
                <Skeleton className="mt-1 h-2 w-2 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-3 w-10 shrink-0" />
              </div>
            ))}
          </div>
        ) : inbox && inbox.length > 0 ? (
          <div className="divide-y divide-border rounded-lg border border-border bg-white overflow-hidden">
            {inbox.map((thread) => {
              const unread = isUnread(thread)
              return (
                <Link
                  key={thread.threadId}
                  to={`/inbox/${thread.threadId}`}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
                >
                  {unread ? (
                    <div
                      className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0"
                      data-testid={`unread-dot-${thread.threadId}`}
                    />
                  ) : (
                    <div className="mt-1 h-2 w-2 rounded-full shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm ${unread ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                        {getThreadLabel(thread)}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {thread.type === 'ANNOUNCEMENT' ? 'Announcement' : 'Direct'}
                      </Badge>
                    </div>
                    {thread.latestMessage && (
                      <p className={`text-sm truncate ${unread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {thread.latestMessage.body}
                      </p>
                    )}
                  </div>
                  {thread.latestMessage && (
                    <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                      {formatSentAt(thread.latestMessage.sentAt)}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center mt-12">No messages yet.</p>
        )}
      </div>
    </main>
  )
}
