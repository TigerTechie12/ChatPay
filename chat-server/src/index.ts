import { WebSocketServer } from 'ws'
import { PrismaClient } from 'chatpay-db'
import { PrismaPg } from '@prisma/adapter-pg'
import http from 'http'
import express from 'express'
import cors from 'cors'
import url from 'url'
import jwt from 'jsonwebtoken'
import { chatRouter } from './routes/route'
import redis from './lib/redis'

const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})
const JWT_SECRET = process.env.JWT_SECRET as string
const activeConnections = new Map()
const app = express()
app.use(cors())
app.use(chatRouter)
const wss = new WebSocketServer({ noServer: true })
const server = http.createServer(app)

server.on('upgrade', (req, socket, head) => {
  const { query } = url.parse(req.url as string, true)
  const token = query.token as string
  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return
  }
  try {
    const decode = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
    const userId = Number(decode.userId)
    wss.handleUpgrade(req, socket as any, head as any, (ws) => {
      ;(ws as any).userId = userId
      activeConnections.set(userId, ws)
      ws.on('close', () => { activeConnections.delete(userId) })
      wss.emit('connection', ws, req)
    })
  } catch (e) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
  }
})

wss.on('connection', (socket) => {
  const userId = (socket as any).userId
  socket.on('message', async (rawMessage: any) => {
    const data = JSON.parse(rawMessage)
    const conversationId = Number(data.conversationId)

    if (data.type === 'TYPING') {
      const participants = await prisma.conversationParticipant.findMany({ where: { conversationId } })
      for (const p of participants) {
        if (p.userId !== userId) {
          const ws = activeConnections.get(p.userId)
          if (ws) ws.send(JSON.stringify({ type: 'USER_TYPING', conversationId, typerId: userId }))
        }
      }
      return
    }

    const participants = await prisma.conversationParticipant.findMany({ where: { conversationId } })
    const isMember = participants.some((p: any) => p.userId === userId)
    if (!isMember) {
      console.error('[ws] not a member', { userId, conversationId, participantIds: participants.map((p:any)=>p.userId) })
      return
    }

    const savedMessage = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        cipherText: data.cipherText,
        nonce: data.nonce,
        createdAt: new Date()
      }
    })
    console.log('[ws] saved message', savedMessage.id, 'in conversation', conversationId)

    redis.publish('chat:messages', JSON.stringify(savedMessage))

    for (const p of participants) {
      if (p.userId !== userId) {
        const ws = activeConnections.get(p.userId)
        console.log('[ws] delivering to', p.userId, '— connected:', !!ws, '| online users:', [...activeConnections.keys()])
        if (ws) ws.send(JSON.stringify(savedMessage))
      }
    }
  })

  socket.on('close', () => { activeConnections.delete(userId) })
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 3003
server.listen(PORT, () => console.log(`Chat server listening on port ${PORT}`))
