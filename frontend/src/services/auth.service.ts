import api from './api'
import { User } from '../types'

interface AuthResponse { user: User; token: string }

export const authService = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),

  register: (name: string, email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { name, email, password }).then((r) => r.data),

  me: () => api.get<User>('/auth/me').then((r) => r.data),
}
