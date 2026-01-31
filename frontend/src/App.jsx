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
import ProtectedRoute from './components/ProtectedRoute'

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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
