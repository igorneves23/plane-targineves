import api from './api'
import { Column } from '../types'

export const columnService = {
  create: (boardId: string, title: string) =>
    api.post<Column>('/columns', { boardId, title }).then((r) => r.data),
  update: (id: string, data: { title?: string }) =>
    api.put<Column>(`/columns/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/columns/${id}`),
}
