import api from './api'
import { Board } from '../types'

export const boardService = {
  list: () => api.get<Board[]>('/boards').then((r) => r.data),
  get: (id: string) => api.get<Board>(`/boards/${id}`).then((r) => r.data),
  create: (data: { title: string; description?: string; color?: string }) =>
    api.post<Board>('/boards', data).then((r) => r.data),
  update: (id: string, data: Partial<{ title: string; description: string; color: string }>) =>
    api.put<Board>(`/boards/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/boards/${id}`),
}
