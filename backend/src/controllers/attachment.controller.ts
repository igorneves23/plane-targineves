import { Response } from 'express'
import fs from 'fs'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middlewares/auth'

export async function uploadAttachment(req: AuthRequest, res: Response) {
  if (!req.file) {
    res.status(400).json({ error: 'Arquivo não enviado' })
    return
  }

  const { cardId } = req.body
  if (!cardId) {
    fs.unlinkSync(req.file.path)
    res.status(400).json({ error: 'cardId obrigatório' })
    return
  }

  const attachment = await prisma.attachment.create({
    data: {
      cardId,
      filename: req.file.originalname,
      path: `/uploads/${req.file.filename}`,
      size: req.file.size,
    },
  })
  res.status(201).json(attachment)
}

export async function deleteAttachment(req: AuthRequest, res: Response) {
  const att = await prisma.attachment.findUnique({ where: { id: req.params.id } })
  if (!att) {
    res.status(404).json({ error: 'Anexo não encontrado' })
    return
  }

  const fullPath = `${__dirname}/../../uploads/${att.path.split('/uploads/')[1]}`
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)

  await prisma.attachment.delete({ where: { id: req.params.id } })
  res.status(204).send()
}
