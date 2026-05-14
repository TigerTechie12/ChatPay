import express from 'express'
import { Router } from 'express'
import { PrismaClient } from 'chatpay-db'
import { PrismaPg } from '@prisma/adapter-pg'
import { authMiddleware } from 'chatpay-middleware'
import { merchantWithdrawalQueue } from '../lib/queue'
import { z } from 'zod'

export const payOutRouter=Router()
const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})
payOutRouter.use(express.json())

const withdrawSchema = z.object({
  amount: z.number().positive(),
  accountNumber: z.string().min(1),
  ifscCode: z.string().min(1)
})

payOutRouter.post('/merchant/manual/withdraw', authMiddleware, async(req:any,res:any)=>{
    const parsed = withdrawSchema.safeParse(req.body)
    if(!parsed.success) return res.status(400).json({message: parsed.error.issues[0]?.message ?? 'Invalid input'})
    const {amount, accountNumber, ifscCode} = parsed.data
    const amountInPaise = amount * 100
    const merchantId = req.userId
    try{
        await prisma.$transaction(async(txn:any)=>{
            await txn.$queryRaw`SELECT * FROM "MerchantBalance" WHERE "merchantId"=${merchantId} FOR UPDATE`
            const balance = await txn.merchantBalance.findUnique({where:{merchantId}})
            if(!balance) return res.status(404).json({message:"Balance not found"})
            const availableBalance = balance.amount - balance.locked
            if(availableBalance < amountInPaise) return res.status(400).json({message:"Insufficient balance"})
            await txn.merchantBalance.update({where:{merchantId}, data:{locked:{increment:amountInPaise}}})
            const offRampTxn = await txn.offRampTransaction.create({data:{
                amount: amountInPaise,
                accountNumber,
                ifscCode,
                merchantId,
                status:'QUEUED'
            }})
            await merchantWithdrawalQueue.add('offRampTxn', {offRampTxnId: offRampTxn.id}, {
                jobId: String(offRampTxn.id),
                removeOnComplete: true,
                removeOnFail: {age: 24 * 3600},
                attempts: 5,
                backoff: {type: 'fixed', delay: 10000}
            })
            res.json({message:'Withdrawal Request Queued', id: offRampTxn.id})
        })
    }
    catch(e:any){ res.status(400).json({message: e.message}) }
})
