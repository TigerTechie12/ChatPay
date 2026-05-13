import { Router } from "express"
import { PrismaClient } from "chatpay-db"
import { PrismaPg } from "@prisma/adapter-pg"
import { authMiddleware } from "chatpay-middleware"
import { p2pWSchema } from "shreyash-chatpay-common"
import { rateLimitMiddleware } from "../lib/rateLimiter"
import redis from "../lib/redis"

const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})
export const walletPayRouter = Router()

const walletLimiter = rateLimitMiddleware('p2p-wallet', 10, 60)

walletPayRouter.post('/payAtWallet', authMiddleware, walletLimiter, async(req, res) => {
  const parsed = p2pWSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({message: parsed.error.issues[0]?.message ?? 'Invalid input'})
  const {phoneNumber, amount} = parsed.data

  const userId: any = req.userId
  const amountInPaise = amount * 100
  try {
    const userBalance = await prisma.balance.findUnique({where: {userId}})
    if (!userBalance) return res.status(404).json({message: "Balance not found"})
    const availableBalance = userBalance.amount - userBalance.locked
    if (amountInPaise > availableBalance) return res.status(400).json({message: "Insufficient Balance"})

    const recipient = await prisma.user.findUnique({where: {number: phoneNumber}})
    if (!recipient) return res.status(404).json({message: "Recipient not found with given phone number"})

    await prisma.$transaction(async(txn: any) => {
      await txn.$queryRaw`SELECT * FROM "Balance" WHERE "userId"=${userId} FOR UPDATE`
      await txn.balance.update({where: {userId}, data: {amount: {decrement: amountInPaise}}})
      await txn.balance.update({where: {userId: recipient.id}, data: {amount: {increment: amountInPaise}}})
      await txn.p2pTransfer.create({data: {
        senderId: userId,
        receiverId: recipient.id,
        amount: amountInPaise,
        timestamp: new Date()
      }})
    })

    await redis.del(`profile:${userId}`)
    return res.status(200).json({message: "Payment Successful"})
  } catch(e: any) {
    return res.status(400).json({message: e.message})
  }
})
