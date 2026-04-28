import express from "express"
import { Router } from "express"
import { PrismaClient } from 'chatpay-db'
import {PrismaPg} from '@prisma/adapter-pg'
const adapter=new PrismaPg({connectionString:process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})
import { authMiddleware } from "chatpay-middleware"
export const p2mRouter=Router()
import IORedis from 'ioredis'
p2mRouter.use(express.json())
const redis=new IORedis()

p2mRouter.get('/merchant/:merchantId', authMiddleware, async(req: any, res: any) => {
  const merchantId = parseInt(req.params.merchantId)
  if (isNaN(merchantId)) return res.status(400).json({ message: "Invalid merchantId" })
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, name: true, authType: true }
    })
    if (!merchant) return res.status(404).json({ message: "Merchant not found" })
    return res.json({ id: merchant.id, name: merchant.name, verified: true })
  } catch(e: any) { return res.status(500).json({ message: e.message }) }
})

p2mRouter.post('/transfer/merchant', authMiddleware, async(req: any, res: any) => {
const {amount,merchantId,label}=req.body
const userId=req.userId
const channel=`channel-${merchantId}`
try{
  const balance = await prisma.balance.findUnique({where:{userId:userId}})
  if (!balance) return res.status(404).json({message:"Balance not found"})
  const availableBalance = balance.amount - balance.locked
  if(availableBalance < amount*100) return res.status(400).json({message:"Insufficient balance"})

  await prisma.$transaction(async(txn:any)=>{
    await txn.$queryRaw`SELECT * FROM "Balance" WHERE "userId"=${userId} FOR UPDATE`
    await txn.balance.update({where:{userId:userId}, data:{amount:{decrement: amount*100}}})
    await txn.merchantBalance.update({where:{merchantId:merchantId}, data:{amount:{increment: amount*100}}})
    await txn.merchantPayment.create({data:{amount: amount*100, merchantId:merchantId, userId:userId}})
  })

  await redis.publish(channel, JSON.stringify({message:`Payment of ₹${amount} received`}))
  return res.status(200).json({message:"Payment Successful to the Merchant"})
} catch(e:any){ return res.status(400).json({message:e.message}) }
})
