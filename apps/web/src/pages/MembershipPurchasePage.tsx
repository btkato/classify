import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-react'
import { Button } from '../components/ui/button'
import { apiFetch } from '../lib/api'
import type { Membership } from '../lib/types'

interface MembershipOption {
  type: string
  label: string
  price: string
  description: string
}

// Prices are placeholders — replaced with Stripe product data in Phase 8
const MEMBERSHIP_OPTIONS: MembershipOption[] = [
  { type: 'DROP_IN', label: 'Drop-in', price: '$20', description: 'Single class access. No expiry.' },
  { type: 'CLASS_PACK_5', label: 'Class Pack (5)', price: '$85', description: '5 classes. No expiry. $17 per class.' },
  { type: 'CLASS_PACK_10', label: 'Class Pack (10)', price: '$160', description: '10 classes. No expiry. $16 per class.' },
  { type: 'MONTHLY', label: 'Monthly', price: '$120', description: 'Unlimited classes. 30 days access.' },
  { type: 'CONTINUOUS_MONTHLY', label: 'Continuous Monthly', price: '$110/mo', description: 'Unlimited classes. Auto-renews monthly. Cancel anytime.' },
  { type: 'YEARLY', label: 'Yearly', price: '$1,100', description: 'Unlimited classes. 365 days. ~$92 per month.' },
]

export default function MembershipPurchasePage() {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = useState<string | null>(null)

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
        {MEMBERSHIP_OPTIONS.map((option) => (
          <label key={option.type} className="cursor-pointer h-full">
            <input
              type="radio"
              name="membershipType"
              value={option.type}
              className="sr-only"
              onChange={() => setSelectedType(option.type)}
            />
            <div
              className={`h-full rounded-lg border-2 px-5 py-4 flex flex-col transition-colors hover:border-foreground/40 ${
                selectedType === option.type
                  ? 'border-foreground bg-muted/50'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-start justify-between">
                <p className="font-semibold text-sm">{option.label}</p>
                <p className="font-bold text-sm">{option.price}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{option.description}</p>
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
