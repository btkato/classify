import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useThread } from '../hooks/useThread'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useReplyToThread } from '../hooks/useReplyToThread'
import { useSendAnnouncement } from '../hooks/useSendAnnouncement'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { Badge } from '../components/ui/badge'
import { Textarea } from '../components/ui/textarea'

function formatMessageTime(sentAt: string): string {
  return new Date(sentAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ThreadPage() {
  const { threadId } = useParams<{ threadId: string }>()
  const { data: thread, isLoading } = useThread(threadId ?? '')
  const { data: currentUser } = useCurrentUser()
  const replyToThread = useReplyToThread(threadId ?? '')
  const sendAnnouncement = useSendAnnouncement()
  const queryClient = useQueryClient()
  const [replyBody, setReplyBody] = useState('')

  const currentParticipant = thread?.participants.find(
    (participant) => participant.userId === currentUser?.id
  )
  const canReply = currentParticipant?.canReply ?? false

  const otherParticipant = thread?.participants.find(
    (participant) => participant.userId !== currentUser?.id
  )

  const threadTitle =
    thread?.type === 'ANNOUNCEMENT'
      ? null
      : otherParticipant
        ? `${otherParticipant.user.firstName} ${otherParticipant.user.lastName}`
        : 'Direct Message'

  function handleDirectReply(event: React.FormEvent) {
    event.preventDefault()
    if (!replyBody.trim()) return
    replyToThread.mutate(replyBody, {
      onSuccess: () => setReplyBody(''),
    })
  }

  function handleAnnouncementReply(event: React.FormEvent) {
    event.preventDefault()
    if (!replyBody.trim() || !thread?.classId) return
    sendAnnouncement.mutate(
      { classId: thread.classId, body: replyBody },
      {
        onSuccess: () => {
          setReplyBody('')
          void queryClient.invalidateQueries({ queryKey: ['thread', threadId] })
        },
      }
    )
  }

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-6 h-7 w-48" />
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-16 w-2/3" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  if (!thread) return null

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to="/inbox" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Inbox
      </Link>

      <div className="mt-6">
        {thread.type === 'ANNOUNCEMENT' ? (
          <>
            <h1 className="text-2xl font-bold">{thread.className ?? 'Class Announcement'}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">Class announcement</Badge>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{threadTitle}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">Direct message</Badge>
            </div>
          </>
        )}
      </div>

      {thread.type === 'DIRECT' ? (
        <div className="mt-6 space-y-4">
          {thread.messages.map((message) => {
            const isSent = message.senderId === currentUser?.id
            return (
              <div key={message.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[70%]">
                  <p className={`text-xs text-muted-foreground mb-1 ${isSent ? 'text-right' : ''}`}>
                    {isSent ? 'You' : `${otherParticipant?.user.firstName} ${otherParticipant?.user.lastName}`}
                    {' · '}
                    {formatMessageTime(message.sentAt)}
                  </p>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm ${
                      isSent
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-white border border-border text-foreground rounded-tl-sm'
                    }`}
                  >
                    {message.body}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {thread.messages.map((message) => {
            const sender = thread.participants.find((p) => p.userId === message.senderId)
            return (
              <div key={message.id} className="rounded-lg border border-border bg-white px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {sender ? `${sender.user.firstName} ${sender.user.lastName}` : 'Unknown'}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatMessageTime(message.sentAt)}</span>
                </div>
                <p className="text-sm text-foreground">{message.body}</p>
              </div>
            )
          })}
        </div>
      )}

      {canReply && thread.type === 'DIRECT' && (
        <form onSubmit={handleDirectReply} className="mt-6 border border-border rounded-lg bg-white overflow-hidden">
          <Textarea
            placeholder="Write a reply…"
            value={replyBody}
            onChange={(event) => setReplyBody(event.target.value)}
            rows={3}
            className="border-0 rounded-none focus-visible:ring-0 resize-none"
          />
          <div className="px-4 py-2.5 border-t border-border flex justify-end bg-muted/30">
            <Button type="submit" disabled={replyToThread.isPending || !replyBody.trim()}>
              Send
            </Button>
          </div>
        </form>
      )}

      {canReply && thread.type === 'ANNOUNCEMENT' && (
        <form onSubmit={handleAnnouncementReply} className="mt-6 border border-border rounded-lg bg-white overflow-hidden">
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Post a follow-up</p>
          </div>
          <Textarea
            placeholder="Send another announcement to enrolled students…"
            value={replyBody}
            onChange={(event) => setReplyBody(event.target.value)}
            rows={3}
            className="border-0 rounded-none focus-visible:ring-0 resize-none"
          />
          <div className="px-4 py-2.5 border-t border-border flex justify-end bg-muted/30">
            <Button type="submit" disabled={sendAnnouncement.isPending || !replyBody.trim()}>
              Send Announcement
            </Button>
          </div>
        </form>
      )}

      {!canReply && thread.type === 'ANNOUNCEMENT' && (
        <p className="mt-6 text-sm text-muted-foreground text-center">
          This is a read-only announcement thread. Replies are not enabled.
        </p>
      )}
    </main>
  )
}
