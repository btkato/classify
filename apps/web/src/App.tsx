import { lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { SignIn, SignUp } from '@clerk/clerk-react'
import { z } from 'zod'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import RoleProtectedRoute from './components/RoleProtectedRoute'

function NotFoundPage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you're looking for doesn't exist.
      </p>
    </main>
  )
}

const ClassListPage = lazy(() => import('./pages/ClassListPage'))
const ClassDetailPage = lazy(() => import('./pages/ClassDetailPage'))
const LessonSetDetailPage = lazy(() => import('./pages/LessonSetDetailPage'))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))
const MyRegistrationsPage = lazy(() => import('./pages/MyRegistrationsPage'))
const MembershipsPage = lazy(() => import('./pages/MembershipsPage'))
const MembershipPurchasePage = lazy(() => import('./pages/MembershipPurchasePage'))
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'))
const InstructorClassListPage = lazy(() => import('./pages/InstructorClassListPage'))
const InstructorClassDetailPage = lazy(() => import('./pages/InstructorClassDetailPage'))
const InstructorRosterPage = lazy(() => import('./pages/InstructorRosterPage'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminCategoryPage = lazy(() => import('./pages/AdminCategoryPage'))
const AdminUserListPage = lazy(() => import('./pages/AdminUserListPage'))
const AdminUserDetailPage = lazy(() => import('./pages/AdminUserDetailPage'))
const AdminMembershipPage = lazy(() => import('./pages/AdminMembershipPage'))
const AdminClassListPage = lazy(() => import('./pages/AdminClassListPage'))
const AdminClassFormPage = lazy(() => import('./pages/AdminClassFormPage'))
const AdminClassEditPage = lazy(() => import('./pages/AdminClassEditPage'))
const AdminLessonSetListPage = lazy(() => import('./pages/AdminLessonSetListPage'))
const AdminLessonSetFormPage = lazy(() => import('./pages/AdminLessonSetFormPage'))
const AdminLessonSetEditPage = lazy(() => import('./pages/AdminLessonSetEditPage'))
const AdminNotificationsPage = lazy(() => import('./pages/AdminNotificationsPage'))
const AdminNotificationJobsPage = lazy(() => import('./pages/AdminNotificationJobsPage'))
const InboxPage = lazy(() => import('./pages/InboxPage'))
const ThreadPage = lazy(() => import('./pages/ThreadPage'))
const AdminComposePage = lazy(() => import('./pages/AdminComposePage'))

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
          <Route path="/classes/lesson-sets/:id" element={<LessonSetDetailPage />} />
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

          <Route
            path="/instructor"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="INSTRUCTOR">
                  <InstructorDashboard />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/classes"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="INSTRUCTOR">
                  <InstructorClassListPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/classes/:id"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="INSTRUCTOR">
                  <InstructorClassDetailPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/classes/:id/roster"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="INSTRUCTOR">
                  <InstructorRosterPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="ADMIN">
                  <AdminDashboard />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="ADMIN">
                  <AdminCategoryPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="ADMIN">
                  <AdminUserListPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users/:id"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="ADMIN">
                  <AdminUserDetailPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/memberships"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="ADMIN">
                  <AdminMembershipPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="ADMIN">
                  <AdminClassListPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/classes/new"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="ADMIN">
                  <AdminClassFormPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/classes/:id"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="ADMIN">
                  <AdminClassEditPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/lesson-sets"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="ADMIN">
                  <AdminLessonSetListPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/lesson-sets/new"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="ADMIN">
                  <AdminLessonSetFormPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/lesson-sets/:id"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="ADMIN">
                  <AdminLessonSetEditPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="ADMIN">
                  <AdminNotificationsPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notification-jobs"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="ADMIN">
                  <AdminNotificationJobsPage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />

          {/* /inbox/compose must come before /inbox/:threadId — static routes first */}
          <Route
            path="/inbox/compose"
            element={
              <ProtectedRoute>
                <RoleProtectedRoute role="ADMIN">
                  <AdminComposePage />
                </RoleProtectedRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/inbox/:threadId"
            element={
              <ProtectedRoute>
                <ThreadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inbox"
            element={
              <ProtectedRoute>
                <InboxPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
  )
}
