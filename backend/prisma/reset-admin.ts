import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const newPassword = process.argv[2] || 'admin123'
  const hash = await bcrypt.hash(newPassword, 10)

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' } })
  if (!admin) {
    console.error('Nenhum usuário ADMIN encontrado.')
    process.exit(1)
  }

  await prisma.user.update({ where: { id: admin.id }, data: { password: hash } })
  console.log(`Senha resetada para: ${admin.email}`)
  console.log(`Nova senha: ${newPassword}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
