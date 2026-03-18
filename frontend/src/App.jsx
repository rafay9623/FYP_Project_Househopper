import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/contexts/AuthContext'
import Home from './pages/Home'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import AddProperty from './pages/AddProperty'
import Portfolio from './pages/Portfolio'
import ROICalculator from './pages/ROICalculator'
import BrowseUsers from './pages/BrowseUsers'
import UserProperties from './pages/UserProperties'
import ChatPage from './pages/ChatPage'
import HeatMapPage from './pages/HeatMapPage'
import Recommendations from './pages/Recommendations'
import ProtectedRoute from './components/ProtectedRoute'
import Chatbot from '@/components/Chatbot'
import AdminRoute from '@/components/AdminRoute'
import AdminLayout from '@/pages/admin/AdminLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminProperties from '@/pages/admin/AdminProperties'
import AdminSubscriptions from '@/pages/admin/AdminSubscriptions'
import AdminChats from '@/pages/admin/AdminChats'

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth/signin" element={<SignIn />} />
            <Route path="/auth/signup" element={<SignUp />} />
            <Route path="/auth/verify-email" element={<VerifyEmail />} />
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
                  <HeatMapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roi-calculator/:id?"
              element={
                <ProtectedRoute>
                  <ROICalculator />
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
                  <Recommendations />
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
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
          <Chatbot />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
