import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { SidebarProvider } from './context/SidebarContext'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Board from './pages/Board'
import Users from './pages/Users'
import WeeklyView from './pages/WeeklyView'
import WorkloadView from './pages/WorkloadView'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  const { fetchMe, token } = useAuthStore()

  useEffect(() => {
    if (token) fetchMe()
  }, [token, fetchMe])

  return (
    <ThemeProvider>
      <SidebarProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/weekly" element={<PrivateRoute><WeeklyView /></PrivateRoute>} />
          <Route path="/workload" element={<PrivateRoute><WorkloadView /></PrivateRoute>} />
          <Route path="/board/:id" element={<PrivateRoute><Board /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </SidebarProvider>
    </ThemeProvider>
  )
}
