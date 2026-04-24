import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { SlidersHorizontal } from 'lucide-react'
import { useMyRegistrations } from '../hooks/useMyRegistrations'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '../components/ui/sheet'
import { apiFetch } from '../lib/api'
import { Skeleton } from '../components/ui/skeleton'
import type { RegistrationWithClass } from '../lib/types'

type Tab = 'upcoming' | 'past'

const ALL_STATUSES = ['ENROLLED', 'WAITLISTED', 'ATTENDED', 'CANCELLED', 'ABSENT']

interface FilterState {
  statuses: string[]
  dateFrom: string
  dateTo: string
}

const DEFAULT_FILTERS: FilterState = {
  statuses: ALL_STATUSES,
  dateFrom: '',
  dateTo: '',
}

function formatStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase()
}

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
  const [searchInput, setSearchInput] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [pendingFilters, setPendingFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS)

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken()
      return apiFetch(`/registrations/${id}`, token ?? undefined, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-registrations'] })
    },
  })

  function handleClearSearch() {
    setSearchInput('')
    setActiveSearch('')
  }

  function handleFilterOpenChange(open: boolean) {
    if (open) setPendingFilters(appliedFilters)
    setIsFilterOpen(open)
  }

  function togglePendingStatus(status: string) {
    setPendingFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }))
  }

  function handleApplyFilters() {
    setAppliedFilters(pendingFilters)
    setIsFilterOpen(false)
  }

  function handleClearFilters() {
    setPendingFilters(DEFAULT_FILTERS)
    setAppliedFilters(DEFAULT_FILTERS)
    setIsFilterOpen(false)
  }

  const activeFilterCount =
    (appliedFilters.statuses.length < ALL_STATUSES.length ? 1 : 0) +
    (appliedFilters.dateFrom ? 1 : 0) +
    (appliedFilters.dateTo ? 1 : 0)

  const allRegistrations = registrations ?? []

  const tabFiltered = allRegistrations.filter((reg) =>
    tab === 'upcoming' ? isUpcoming(reg) : !isUpcoming(reg)
  )

  const displayed = tabFiltered
    .filter((reg) => appliedFilters.statuses.includes(reg.status))
    .filter((reg) => {
      if (!appliedFilters.dateFrom) return true
      return new Date(reg.class.startsAt) >= new Date(appliedFilters.dateFrom)
    })
    .filter((reg) => {
      if (!appliedFilters.dateTo) return true
      const to = new Date(appliedFilters.dateTo)
      to.setHours(23, 59, 59, 999)
      return new Date(reg.class.startsAt) <= to
    })
    .filter((reg) => {
      if (!activeSearch.trim()) return true
      return reg.class.title.toLowerCase().includes(activeSearch.trim().toLowerCase())
    })

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">My Registrations</h1>

      <Sheet open={isFilterOpen} onOpenChange={handleFilterOpenChange}>
        <div className="mt-6 flex gap-2">
          <SheetTrigger asChild>
            <Button variant="outline" type="button" className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>

          <form
            onSubmit={(event) => { event.preventDefault(); setActiveSearch(searchInput) }}
            className="flex gap-2 max-w-sm"
          >
            <Input
              placeholder="Search by class name..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            {activeSearch && (
              <Button type="button" variant="ghost" onClick={handleClearSearch}>
                Clear
              </Button>
            )}
            <Button type="submit">Search</Button>
          </form>
        </div>

        <SheetContent side="right" className="flex flex-col p-0 gap-0">
          <div className="border-b border-border px-5 py-4">
            <SheetTitle>Filters</SheetTitle>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </p>
              <div className="space-y-2.5">
                {ALL_STATUSES.map((status) => (
                  <label key={status} className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={pendingFilters.statuses.includes(status)}
                      onChange={() => togglePendingStatus(status)}
                      className="h-4 w-4 rounded border-input accent-foreground"
                    />
                    {formatStatus(status)}
                  </label>
                ))}
              </div>
            </div>

            <hr className="border-border" />

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Class Date
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="date-from" className="text-xs text-muted-foreground">From</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={pendingFilters.dateFrom}
                    onChange={(event) =>
                      setPendingFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="date-to" className="text-xs text-muted-foreground">To</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={pendingFilters.dateTo}
                    onChange={(event) =>
                      setPendingFilters((prev) => ({ ...prev, dateTo: event.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto border-t border-border px-5 py-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleClearFilters}>
              Clear all
            </Button>
            <Button className="flex-1" onClick={handleApplyFilters}>
              Apply
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
        {isLoading ? (
          <div data-testid="loading-skeleton" className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : displayed.length === 0 ? (
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
                        : formatStatus(reg.status)}
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
