import { Routes, Route, useLocation } from 'react-router-dom'
import { SignIn, SignUp } from '@clerk/clerk-react'
import { z } from 'zod'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ClassListPage from './pages/ClassListPage'
import ClassDetailPage from './pages/ClassDetailPage'
import StudentDashboard from './pages/StudentDashboard'
import MyRegistrationsPage from './pages/MyRegistrationsPage'
import MembershipsPage from './pages/MembershipsPage'
import MembershipPurchasePage from './pages/MembershipPurchasePage'

const locationStateSchema = z.object({ from: z.object({ pathname: z.string() }) }).nullable()

function SignInPage() {
  const location = useLocation()
  const from = locationStateSchema.safeParse(location.state).data?.from?.pathname ?? '/dashboard'
  return <SignIn routing="path" path="/sign-in" forceRedirectUrl={from} />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ClassListPage />} />
        <Route path="/classes" element={<ClassListPage />} />
        <Route path="/classes/:id" element={<ClassDetailPage />} />

        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-registrations"
          element={
            <ProtectedRoute>
              <MyRegistrationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/memberships"
          element={
            <ProtectedRoute>
              <MembershipsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/memberships/purchase"
          element={
            <ProtectedRoute>
              <MembershipPurchasePage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<p className="text-muted-foreground">404 — Page not found</p>} />
      </Route>
    </Routes>
  )
}
