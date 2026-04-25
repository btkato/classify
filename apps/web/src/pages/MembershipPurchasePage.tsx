import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { apiFetch } from '../lib/api'
import { useMembershipPlans } from '../hooks/useMembershipPlans'
import type { Membership, MembershipPlan } from '../lib/types'

function formatPrice(priceInCents: number, type: string): string {
  const dollars = (priceInCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return type === 'CONTINUOUS_MONTHLY' ? `${dollars}/mo` : dollars
}

export default function MembershipPurchasePage() {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const { data: plans, isLoading } = useMembershipPlans()

  const purchaseMutation = useMutation({
    mutationFn: async (type: string) => {
      const token = await getToken()
      return apiFetch<Membership>('/memberships', token ?? undefined, {
        method: 'POST',
        body: JSON.stringify({ type }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] })
      navigate('/memberships')
    },
  })

  return (
    <main className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/memberships" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; Back to Memberships
      </Link>

      <h1 className="mt-3 text-2xl font-bold">Purchase a Membership</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose the option that fits your schedule.</p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} data-testid="plan-skeleton" className="h-24 w-full rounded-lg" />
            ))
          : plans?.map((plan: MembershipPlan) => (
              <label key={plan.type} className="cursor-pointer h-full">
                <input
                  type="radio"
                  name="membershipType"
                  value={plan.type}
                  className="sr-only"
                  onChange={() => setSelectedType(plan.type)}
                />
                <div
                  className={`h-full rounded-lg border-2 px-5 py-4 flex flex-col transition-colors hover:border-foreground/40 ${
                    selectedType === plan.type
                      ? 'border-foreground bg-muted/50'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-sm">{plan.displayName}</p>
                    <p className="font-bold text-sm">{formatPrice(plan.priceInCents, plan.type)}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                </div>
              </label>
            ))}
      </div>

      <div className="mt-8">
        <Button
          disabled={!selectedType || purchaseMutation.isPending}
          onClick={() => selectedType && purchaseMutation.mutate(selectedType)}
        >
          Purchase
        </Button>
      </div>
    </main>
  )
}
