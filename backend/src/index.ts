import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.routes'
import boardRoutes from './routes/board.routes'
import columnRoutes from './routes/column.routes'
import cardRoutes from './routes/card.routes'
import checklistRoutes from './routes/checklist.routes'
import commentRoutes from './routes/comment.routes'
import labelRoutes from './routes/label.routes'
import attachmentRoutes from './routes/attachment.routes'
import userRoutes from './routes/user.routes'
import { startRecurrenceJob } from './jobs/recurrence.job'
import { startUrgentReminderJob } from './jobs/urgentReminder.job'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }))
app.use(express.json({ limit: '10mb' }))
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.use('/auth', authRoutes)
app.use('/boards', boardRoutes)
app.use('/columns', columnRoutes)
app.use('/cards', cardRoutes)
app.use('/checklist', checklistRoutes)
app.use('/comments', commentRoutes)
app.use('/labels', labelRoutes)
app.use('/attachments', attachmentRoutes)
app.use('/users', userRoutes)

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }))

startRecurrenceJob()
startUrgentReminderJob()

app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`))
