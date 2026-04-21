import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { useMemberships } from '../hooks/useMemberships'
import { useMembershipHistory } from '../hooks/useMembershipHistory'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { apiFetch } from '../lib/api'
import type { Membership } from '../lib/types'

function formatMembershipType(type: string): string {
  switch (type) {
    case 'MONTHLY': return 'Monthly'
    case 'CONTINUOUS_MONTHLY': return 'Continuous Monthly'
    case 'YEARLY': return 'Yearly'
    case 'DROP_IN': return 'Drop-in'
    case 'CLASS_PACK_5': return 'Class Pack (5)'
    case 'CLASS_PACK_10': return 'Class Pack (10)'
    default: return type
  }
}

function formatMembershipDetail(membership: Membership): string {
  if (membership.classesRemaining !== null) {
    return `${membership.classesRemaining} classes remaining`
  }
  if (membership.expiresAt) {
    const date = new Date(membership.expiresAt).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    return `Expires ${date}`
  }
  return ''
}

function formatStatusBadge(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase()
}

function formatPurchaseDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function MembershipsPage() {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null)
  const [historyPage, setHistoryPage] = useState(1)

  const { data: memberships, isLoading: memsLoading } = useMemberships()
  const { data: history, isLoading: historyLoading } = useMembershipHistory(historyPage)

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      return apiFetch(`/memberships/${id}/cancel`, token ?? undefined, { method: 'PATCH' })
    },
    onSuccess: () => {
      setConfirmingCancelId(null)
      queryClient.invalidateQueries({ queryKey: ['memberships'] })
    },
  })

  if (memsLoading || historyLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </main>
    )
  }

  const activeMemberships = (memberships ?? []).filter((m) => m.status === 'ACTIVE')

  const historyData = history?.data ?? []
  const historyTotal = history?.total ?? 0
  const historyTotalPages = history?.totalPages ?? 0
  const historyStart = historyTotal === 0 ? 0 : (historyPage - 1) * 5 + 1
  const historyEnd = historyTotal === 0 ? 0 : historyStart + historyData.length - 1

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Memberships</h1>
        <Button asChild>
          <Link to="/memberships/purchase">Purchase Membership</Link>
        </Button>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Active
        </h2>

        {activeMemberships.length === 0 ? (
          <div>
            <p className="text-sm text-muted-foreground">No active memberships.</p>
            <Button asChild className="mt-3">
              <Link to="/memberships/purchase">Purchase a Membership</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeMemberships.map((membership) => {
              if (confirmingCancelId === membership.id) {
                return (
                  <div
                    key={membership.id}
                    className="rounded-lg border-2 border-destructive/30 bg-destructive/5 px-5 py-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm">{formatMembershipType(membership.type)}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Cancel your subscription? Access continues until{' '}
                        {membership.expiresAt
                          ? new Date(membership.expiresAt).toLocaleDateString(undefined, {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'end of period'}
                        .
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setConfirmingCancelId(null)}
                        className="text-sm font-medium text-muted-foreground hover:text-foreground"
                      >
                        Keep
                      </button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate(membership.id)}
                      >
                        Confirm Cancel
                      </Button>
                    </div>
                  </div>
                )
              }

              return (
                <Card key={membership.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium text-sm">{formatMembershipType(membership.type)}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {formatMembershipDetail(membership)}
                        {membership.type === 'CONTINUOUS_MONTHLY' ? ' · Auto-renews' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">Active</Badge>
                      {membership.type === 'CONTINUOUS_MONTHLY' && (
                        <button
                          onClick={() => setConfirmingCancelId(membership.id)}
                          className="text-sm font-medium text-destructive hover:opacity-75"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Purchase History
          </h2>
          {historyTotal > 0 && (
            <p className="text-xs text-muted-foreground">
              Showing {historyStart}–{historyEnd} of {historyTotal}
            </p>
          )}
        </div>

        {historyData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No purchase history.</p>
        ) : (
          <>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Purchased</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyData.map((membership) => (
                    <tr key={membership.id}>
                      <td className="px-4 py-3 font-medium">{formatMembershipType(membership.type)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatPurchaseDate(membership.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={membership.status === 'ACTIVE' ? 'secondary' : 'outline'}>
                          {formatStatusBadge(membership.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={historyPage === 1}
                onClick={() => setHistoryPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {historyPage} of {historyTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={historyPage >= historyTotalPages}
                onClick={() => setHistoryPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
