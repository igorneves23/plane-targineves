import { create } from 'zustand'
import { Board, Column, Card } from '../types'
import { boardService } from '../services/board.service'
import { columnService } from '../services/column.service'
import { cardService } from '../services/card.service'

interface BoardState {
  boards: Board[]
  activeBoard: Board | null
  loading: boolean
  fetchBoards: () => Promise<void>
  fetchBoard: (id: string) => Promise<void>
  createBoard: (data: { title: string; description?: string; color?: string }) => Promise<Board>
  updateBoard: (id: string, data: Partial<Board>) => Promise<void>
  deleteBoard: (id: string) => Promise<void>
  createColumn: (boardId: string, title: string) => Promise<void>
  updateColumn: (id: string, title: string) => Promise<void>
  deleteColumn: (id: string) => Promise<void>
  reorderColumns: (cols: { id: string; position: number }[]) => Promise<void>
  createCard: (columnId: string, title: string) => Promise<Card>
  moveCard: (cardId: string, targetColumnId: string, position: number) => Promise<void>
  deleteCard: (cardId: string, columnId: string) => Promise<void>
  updateCardInStore: (card: Card) => void
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  activeBoard: null,
  loading: false,

  fetchBoards: async () => {
    set({ loading: true })
    const boards = await boardService.list()
    set({ boards, loading: false })
  },

  fetchBoard: async (id) => {
    set({ loading: true })
    const board = await boardService.get(id)
    set({ activeBoard: board, loading: false })
  },

  createBoard: async (data) => {
    const board = await boardService.create(data)
    set((s) => ({ boards: [board, ...s.boards] }))
    return board
  },

  updateBoard: async (id, data) => {
    const board = await boardService.update(id, data)
    set((s) => ({
      boards: s.boards.map((b) => (b.id === id ? { ...b, ...board } : b)),
      activeBoard: s.activeBoard?.id === id ? { ...s.activeBoard, ...board } : s.activeBoard,
    }))
  },

  deleteBoard: async (id) => {
    await boardService.delete(id)
    set((s) => ({ boards: s.boards.filter((b) => b.id !== id) }))
  },

  createColumn: async (boardId, title) => {
    const col = await columnService.create(boardId, title)
    set((s) => {
      if (!s.activeBoard) return s
      return { activeBoard: { ...s.activeBoard, columns: [...s.activeBoard.columns, { ...col, cards: [] }] } }
    })
  },

  updateColumn: async (id, title) => {
    await columnService.update(id, { title })
    set((s) => {
      if (!s.activeBoard) return s
      return {
        activeBoard: {
          ...s.activeBoard,
          columns: s.activeBoard.columns.map((c) => (c.id === id ? { ...c, title } : c)),
        },
      }
    })
  },

  deleteColumn: async (id) => {
    await columnService.delete(id)
    set((s) => {
      if (!s.activeBoard) return s
      return {
        activeBoard: {
          ...s.activeBoard,
          columns: s.activeBoard.columns.filter((c) => c.id !== id),
        },
      }
    })
  },

  reorderColumns: async (cols) => {
    await columnService.reorder(cols)
    set((s) => {
      if (!s.activeBoard) return s
      const reordered = [...s.activeBoard.columns]
        .map((c) => ({ ...c, position: cols.find((x) => x.id === c.id)?.position ?? c.position }))
        .sort((a, b) => a.position - b.position)
      return { activeBoard: { ...s.activeBoard, columns: reordered } }
    })
  },

  createCard: async (columnId, title) => {
    const card = await cardService.create({ columnId, title })
    set((s) => {
      if (!s.activeBoard) return s
      return {
        activeBoard: {
          ...s.activeBoard,
          columns: s.activeBoard.columns.map((c) =>
            c.id === columnId ? { ...c, cards: [...c.cards, card] } : c
          ),
        },
      }
    })
    return card
  },

  moveCard: async (cardId, targetColumnId, position) => {
    await cardService.move(cardId, targetColumnId, position)
    set((s) => {
      if (!s.activeBoard) return s
      let movedCard: Card | undefined
      s.activeBoard.columns.forEach((c) => {
        const found = c.cards.find((cd) => cd.id === cardId)
        if (found) movedCard = found
      })
      if (!movedCard) return s

      const cols: Column[] = s.activeBoard.columns.map((c) => ({
        ...c,
        cards: c.cards.filter((cd) => cd.id !== cardId),
      }))

      const updated = cols.map((c) => {
        if (c.id !== targetColumnId) return c
        const newCards = [...c.cards]
        const clampedIndex = Math.max(0, Math.min(position, newCards.length))
        newCards.splice(clampedIndex, 0, { ...movedCard!, columnId: targetColumnId, position })
        return { ...c, cards: newCards }
      })

      return { activeBoard: { ...s.activeBoard, columns: updated } }
    })
  },

  deleteCard: async (cardId, columnId) => {
    await cardService.delete(cardId)
    set((s) => {
      if (!s.activeBoard) return s
      return {
        activeBoard: {
          ...s.activeBoard,
          columns: s.activeBoard.columns.map((c) =>
            c.id === columnId ? { ...c, cards: c.cards.filter((cd) => cd.id !== cardId) } : c
          ),
        },
      }
    })
  },

  updateCardInStore: (card) => {
    set((s) => {
      if (!s.activeBoard) return s
      return {
        activeBoard: {
          ...s.activeBoard,
          columns: s.activeBoard.columns.map((c) => ({
            ...c,
            cards: c.cards.map((cd) => (cd.id === card.id ? card : cd)),
          })),
        },
      }
    })
  },
}))
