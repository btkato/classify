import { useEffect } from 'react'
import { useClerk, useAuth } from '@clerk/clerk-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

export function useSessionExpiry() {
  const { addListener } = useClerk()
  const { isSignedIn } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isSignedIn) return

    return addListener(({ session }) => {
      if (session === null) {
        queryClient.removeQueries({ queryKey: ['current-user'] })
        navigate('/sign-in')
      }
    })
  }, [isSignedIn, addListener, queryClient, navigate])
}
