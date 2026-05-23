import { create } from 'zustand'
import { User } from '../types'
import { authService } from '../services/auth.service'

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { user, token } = await authService.login(email, password)
      localStorage.setItem('token', token)
      set({ user, token, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  register: async (name, email, password) => {
    set({ loading: true })
    try {
      const { user, token } = await authService.register(name, email, password)
      localStorage.setItem('token', token)
      set({ user, token, loading: false })
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  fetchMe: async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const user = await authService.me()
      set({ user })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null })
    }
  },
}))
