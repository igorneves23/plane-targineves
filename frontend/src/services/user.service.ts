import api from './api'
import { User, UserRole } from '../types'

export interface UserWithDate extends User {
  createdAt: string
}

export const userService = {
  list: () => api.get<UserWithDate[]>('/users').then((r) => r.data),

  create: (data: { name: string; email: string; password: string; role: UserRole }) =>
    api.post<UserWithDate>('/users', data).then((r) => r.data),

  update: (id: string, data: { name?: string; email?: string; password?: string; role?: UserRole }) =>
    api.put<UserWithDate>(`/users/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/users/${id}`),
}
