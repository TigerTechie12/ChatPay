import express from "express"
import { Router } from "express"
import { PrismaClient } from 'chatpay-db'
import { PrismaPg } from '@prisma/adapter-pg'
import { authMiddleware } from "chatpay-middleware"
import { withdrawalQueue } from '../lib/queue'
import { rateLimitMiddleware } from '../lib/rateLimiter'
import redis from '../lib/redis'
import z from "zod"

const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})
export const offRampRouter = Router()
offRampRouter.use(express.json())

const offRampInput = z.object({
  amount: z.number().positive(),
  accountNumber: z.string().min(1),
  ifscCode: z.string().min(1)
})

const offRampLimiter = rateLimitMiddleware('offramp', 3, 60)

offRampRouter.post("/offramp", authMiddleware, offRampLimiter, async(req, res) => {
  const parsed = offRampInput.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({message: parsed.error.issues[0]?.message ?? 'Invalid input'})
  const {amount, accountNumber, ifscCode} = parsed.data

  const userId: any = req.userId
  const cacheKey = `profile:${userId}`
  try {
    await prisma.$transaction(async(txn: any) => {
      await txn.$queryRaw`SELECT * FROM "Balance" WHERE "userId"=${userId} FOR UPDATE`
      const balance = await txn.balance.findUnique({where: {userId}})
      if (!balance) {
        res.status(404).json({message: "Balance not found"})
        return
      }
      const availableBalance = balance.amount - balance.locked
      if (availableBalance < amount * 100) throw new Error('Insufficient Balance')

      await txn.balance.update({where: {userId}, data: {locked: {increment: amount * 100}}})
      await redis.del(cacheKey)
      const offRampTxn = await txn.offRampTransaction.create({data: {
        status: 'QUEUED',
        amount: amount * 100,
        userId,
        accountNumber,
        ifscCode,
        startedAt: new Date()
      }})

      await withdrawalQueue.add('offRampTxn', {offRampTxnId: offRampTxn.id}, {
        jobId: String(offRampTxn.id),
        removeOnComplete: true,
        removeOnFail: {age: 24 * 3600},
        attempts: 5,
        backoff: {type: 'fixed', delay: 10000}
      })
      res.json({message: 'Withdrawal Request Queued', id: offRampTxn.id})
    })
  } catch(e: any) {
    return res.status(400).json({message: e.message})
  }
})
