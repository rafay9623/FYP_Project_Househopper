import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import ProtectedRoute from './components/ProtectedRoute'
import PlanGate from './components/PlanGate'
import Chatbot from '@/components/Chatbot'
import AdminRoute from '@/components/AdminRoute'
import { Loader2 } from 'lucide-react'

const Home = lazy(() => import('./pages/Home'))
const SignIn = lazy(() => import('./pages/SignIn'))
const SignUp = lazy(() => import('./pages/SignUp'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const AddProperty = lazy(() => import('./pages/AddProperty'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const ROICalculator = lazy(() => import('./pages/ROICalculator'))
const BrowseUsers = lazy(() => import('./pages/BrowseUsers'))
const UserProperties = lazy(() => import('./pages/UserProperties'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const HeatMapPage = lazy(() => import('./pages/HeatMapPage'))
const Recommendations = lazy(() => import('./pages/Recommendations'))
const Pricing = lazy(() => import('./pages/Pricing'))
const SubscriptionSuccess = lazy(() => import('./pages/SubscriptionSuccess'))
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminProperties = lazy(() => import('@/pages/admin/AdminProperties'))
const AdminSubscriptions = lazy(() => import('@/pages/admin/AdminSubscriptions'))
const AdminChats = lazy(() => import('@/pages/admin/AdminChats'))
const AdminVerification = lazy(() => import('@/pages/admin/AdminVerification'))

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <SubscriptionProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth/signin" element={<SignIn />} />
                <Route path="/auth/signup" element={<SignUp />} />
                <Route path="/auth/verify-email" element={<VerifyEmail />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route
                  path="/subscription/success"
                  element={
                    <ProtectedRoute>
                      <SubscriptionSuccess />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/add-property"
                  element={
                    <ProtectedRoute>
                      <AddProperty />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/portfolio"
                  element={
                    <ProtectedRoute>
                      <Portfolio />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/heat-map"
                  element={
                    <ProtectedRoute>
                      <PlanGate feature="heatmap">
                        <HeatMapPage />
                      </PlanGate>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/roi-calculator/:id?"
                  element={
                    <ProtectedRoute>
                      <PlanGate feature="roi">
                        <ROICalculator />
                      </PlanGate>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/browse-users"
                  element={
                    <ProtectedRoute>
                      <BrowseUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/user/:userId/properties"
                  element={
                    <ProtectedRoute>
                      <UserProperties />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <ChatPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/recommendations"
                  element={
                    <ProtectedRoute>
                      <PlanGate feature="recommendations">
                        <Recommendations />
                      </PlanGate>
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="properties" element={<AdminProperties />} />
                  <Route path="subscriptions" element={<AdminSubscriptions />} />
                  <Route path="chats" element={<AdminChats />} />
                  <Route path="verification" element={<AdminVerification />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <Toaster />
            <Chatbot />
          </BrowserRouter>
        </SubscriptionProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
