import api from './api'
import { Card, Activity, WeeklyCard, WorkloadEntry } from '../types'

export const cardService = {
  create: (data: { columnId: string; title: string; description?: string }) =>
    api.post<Card>('/cards', data).then((r) => r.data),
  weekly: () => api.get<WeeklyCard[]>('/cards/weekly').then((r) => r.data),
  workload: () => api.get<WorkloadEntry[]>('/cards/workload').then((r) => r.data),
  get: (id: string) => api.get<Card>(`/cards/${id}`).then((r) => r.data),
  update: (id: string, data: Partial<Card>) =>
    api.put<Card>(`/cards/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/cards/${id}`),
  move: (id: string, columnId: string, position: number) =>
    api.put<Card>(`/cards/${id}/move`, { columnId, position }).then((r) => r.data),
  addMember: (id: string, userId: string) =>
    api.post(`/cards/${id}/members`, { userId }),
  removeMember: (id: string, userId: string) =>
    api.delete(`/cards/${id}/members/${userId}`),
  getActivities: (id: string) =>
    api.get<Activity[]>(`/cards/${id}/activities`).then((r) => r.data),
}
