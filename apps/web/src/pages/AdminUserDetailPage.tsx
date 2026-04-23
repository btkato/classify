import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAdminUser } from '../hooks/useAdminUser'
import { useUpdateUserRoles } from '../hooks/useUpdateUserRoles'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'

const ALL_ROLES = ['STUDENT', 'INSTRUCTOR', 'ADMIN'] as const
type RoleValue = (typeof ALL_ROLES)[number]

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function AdminUserDetailPage() {
  const { id = '' } = useParams()
  const { data: user, isLoading } = useAdminUser(id)
  const updateRoles = useUpdateUserRoles(id)

  const [roleToRevoke, setRoleToRevoke] = useState<RoleValue | null>(null)

  function handleConfirmRevoke() {
    if (!roleToRevoke) return
    updateRoles.mutate(
      { role: roleToRevoke, action: 'revoke' },
      { onSuccess: () => setRoleToRevoke(null) }
    )
  }

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div data-testid="loading-skeleton" className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-6 h-24 w-full" />
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">User not found.</p>
      </main>
    )
  }

  const heldRoles = new Set(user.roles.map((r) => r.role))

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <Link to="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to Users
      </Link>

      <h1 className="mt-6 text-2xl font-bold">
        {user.firstName} {user.lastName}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Joined {formatDate(user.createdAt)}</p>

      <div className="mt-6 rounded-lg border border-border divide-y divide-border">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">Email</span>
          <span className="text-sm font-medium">{user.email}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">Phone</span>
          <span className="text-sm font-medium">{user.phone ?? '—'}</span>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-base font-semibold">Roles</h2>
        <div className="mt-4 rounded-lg border border-border divide-y divide-border">
          {ALL_ROLES.map((role) => {
            const held = heldRoles.has(role)
            return (
              <div key={role} className="flex items-center justify-between px-4 py-3">
                <span className={`text-sm font-medium ${held ? '' : 'text-muted-foreground'}`}>
                  {role}
                </span>
                {role === 'STUDENT' ? (
                  <span className="text-xs text-muted-foreground">Default role</span>
                ) : held ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-auto p-0 text-sm"
                    data-testid={`revoke-${role}`}
                    onClick={() => setRoleToRevoke(role)}
                  >
                    Revoke
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-sm font-medium"
                    data-testid={`grant-${role}`}
                    onClick={() => updateRoles.mutate({ role, action: 'grant' })}
                  >
                    Grant
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Dialog
        open={roleToRevoke !== null}
        onOpenChange={(open) => { if (!open) setRoleToRevoke(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke {roleToRevoke} role</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke{' '}
              <span className="font-medium text-foreground">{roleToRevoke}</span> from{' '}
              <span className="font-medium text-foreground">
                {user.firstName} {user.lastName}
              </span>
              ?{roleToRevoke === 'INSTRUCTOR' && ' This will also delete their instructor profile.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleToRevoke(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRevoke}
              disabled={updateRoles.isPending}
            >
              Revoke role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
