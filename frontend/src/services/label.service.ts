import api from './api'
import { Label } from '../types'

export const labelService = {
  list: () => api.get<Label[]>('/labels').then((r) => r.data),
  create: (name: string, color: string) =>
    api.post<Label>('/labels', { name, color }).then((r) => r.data),
  addToCard: (cardId: string, labelId: string) =>
    api.post(`/labels/card/${cardId}`, { labelId }),
  removeFromCard: (cardId: string, labelId: string) =>
    api.delete(`/labels/card/${cardId}/${labelId}`),
}
