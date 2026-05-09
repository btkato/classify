import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { useCurrentUser } from './useCurrentUser'

export function useProfileGuard() {
  const { isSignedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { data: currentUser } = useCurrentUser()

  useEffect(() => {
    if (!isSignedIn || !currentUser) return
    if (location.pathname === '/complete-profile') return
    if (!currentUser.phone || !currentUser.dateOfBirth) {
      void navigate('/complete-profile', { replace: true })
    }
  }, [isSignedIn, currentUser, location.pathname, navigate])
}
