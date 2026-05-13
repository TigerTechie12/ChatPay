import { Router } from 'express'
import { PrismaClient } from 'chatpay-db'
import { PrismaPg } from '@prisma/adapter-pg'
import { authMiddleware } from 'chatpay-middleware'
import { p2pBSchema } from 'shreyash-chatpay-common'
import { rateLimitMiddleware } from '../lib/rateLimiter'
import { withdrawalQueue } from '../lib/queue'
import IORedis from 'ioredis'

const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})
export const p2pBRouter = Router()
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {maxRetriesPerRequest: null})

const bankLimiter = rateLimitMiddleware('p2p-bank', 3, 60)

p2pBRouter.post('/payAtBank', authMiddleware, bankLimiter, async(req, res) => {
  const parsed = p2pBSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({message: parsed.error.issues[0]?.message ?? 'Invalid input'})
  const {amount, accountNumber, ifscCode} = parsed.data

  const amountInPaise = amount * 100
  const userId: any = req.userId
  const cacheKey = `profile:${userId}`
  try {
    const userBalance = await prisma.balance.findUnique({where: {userId}})
    if (!userBalance) return res.status(404).json({message: "Balance not found"})
    const availableBalance = userBalance.amount - userBalance.locked
    if (amountInPaise > availableBalance) return res.status(400).json({message: "Insufficient Balance"})

    await prisma.$transaction(async(txn: any) => {
      await txn.$queryRaw`SELECT * FROM "Balance" WHERE "userId"=${userId} FOR UPDATE`
      await txn.balance.update({where: {userId}, data: {locked: {increment: amountInPaise}}})
      await redis.del(cacheKey)
      const offRampTxn = await txn.offRampTransaction.create({data: {
        amount: amountInPaise,
        accountNumber,
        ifscCode,
        status: 'QUEUED',
        userId,
        startedAt: new Date()
      }})
      await withdrawalQueue.add('p2pOffRampTxn', {offRampTxnId: offRampTxn.id}, {
        jobId: String(offRampTxn.id),
        removeOnComplete: true,
        removeOnFail: {age: 24 * 3600},
        attempts: 5,
        backoff: {type: 'fixed', delay: 10000}
      })
      res.status(200).json({message: "Bank Payment Initiated", offRampId: offRampTxn.id})
    })
  } catch(e: any) {
    return res.status(400).json({message: e.message})
  }
})
