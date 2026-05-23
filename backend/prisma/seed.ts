import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@plane.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@plane.com',
      password: hash,
      role: 'ADMIN',
    },
  })

  const board = await prisma.board.upsert({
    where: { id: 'seed-board-1' },
    update: {},
    create: {
      id: 'seed-board-1',
      title: 'Produção de Vídeo',
      description: 'Fluxo de produção audiovisual',
      color: '#6366f1',
      createdById: admin.id,
    },
  })

  const columns = [
    { title: 'Briefing', position: 0 },
    { title: 'Planejamento', position: 1 },
    { title: 'Em Andamento', position: 2 },
    { title: 'Aprovação', position: 3 },
    { title: 'Finalizado', position: 4 },
  ]

  for (const col of columns) {
    await prisma.column.create({
      data: { boardId: board.id, ...col },
    })
  }

  const labels = [
    { name: 'Urgente', color: '#ef4444' },
    { name: 'Revisão', color: '#f59e0b' },
    { name: 'Cliente', color: '#3b82f6' },
    { name: 'Aprovação', color: '#10b981' },
    { name: 'Vídeo', color: '#8b5cf6' },
    { name: 'Igreja', color: '#ec4899' },
  ]

  for (const label of labels) {
    await prisma.label.upsert({
      where: { id: `seed-label-${label.name}` },
      update: {},
      create: { id: `seed-label-${label.name}`, ...label },
    })
  }

  console.log('Seed completed. Admin: admin@plane.com / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
