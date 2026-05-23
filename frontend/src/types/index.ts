export type UserRole = 'ADMIN' | 'LEADER' | 'MEMBER'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type CardStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type RecurringType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string | null
  createdAt?: string
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface CardLabel {
  id: string
  labelId: string
  label: Label
}

export interface CardMember {
  id: string
  userId: string
  user: Pick<User, 'id' | 'name' | 'avatar'>
}

export interface ChecklistItem {
  id: string
  cardId: string
  title: string
  completed: boolean
  position: number
  createdAt: string
}

export interface Comment {
  id: string
  cardId: string
  userId: string
  content: string
  createdAt: string
  user: Pick<User, 'id' | 'name' | 'avatar'>
}

export interface Attachment {
  id: string
  cardId: string
  filename: string
  path: string
  size: number
  createdAt: string
}

export interface Activity {
  id: string
  cardId?: string
  userId: string
  action: string
  createdAt: string
  user: Pick<User, 'id' | 'name' | 'avatar'>
}

export interface Card {
  id: string
  columnId: string
  title: string
  description?: string | null
  priority: Priority
  dueDate?: string | null
  status: CardStatus
  position: number
  recurring: boolean
  recurringType?: RecurringType | null
  nextExecution?: string | null
  createdById: string
  createdAt: string
  updatedAt: string
  members: CardMember[]
  labels: CardLabel[]
  checklist: ChecklistItem[]
  comments: Comment[]
  attachments: Attachment[]
  createdBy: Pick<User, 'id' | 'name' | 'avatar'>
  _count?: { checklist: number; comments: number }
}

export interface Column {
  id: string
  boardId: string
  title: string
  position: number
  createdAt: string
  cards: Card[]
}

export interface Board {
  id: string
  title: string
  description?: string | null
  color: string
  createdById: string
  createdAt: string
  updatedAt: string
  createdBy: Pick<User, 'id' | 'name' | 'avatar'>
  columns: Column[]
  _count?: { columns: number }
}
