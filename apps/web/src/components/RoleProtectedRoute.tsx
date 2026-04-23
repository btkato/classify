import { Navigate } from 'react-router-dom'
import { useCurrentUser } from '../hooks/useCurrentUser'

interface RoleProtectedRouteProps {
  role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT'
  children: React.ReactNode
}

export default function RoleProtectedRoute({ role, children }: RoleProtectedRouteProps) {
  const { isLoading, data: currentUser } = useCurrentUser()

  if (isLoading) return null

  const hasRole = currentUser?.roles.some((userRole) => userRole.role === role) ?? false

  if (!hasRole) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
