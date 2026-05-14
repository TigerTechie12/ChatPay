import express from 'express'
import { Router } from 'express'
import { PrismaClient } from 'chatpay-db'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})
import { authMiddleware } from 'chatpay-middleware'
export const dashboardRouter=Router()
dashboardRouter.use(express.json())
dashboardRouter.use(authMiddleware)

dashboardRouter.get('/merchant/balance',async(req:any,res:any)=>{
    const merchantId=req.userId
    if(!merchantId) return res.status(400).json({message:"Invalid merchant ID"})
    const merchantBalance=await prisma.merchantBalance.findUnique({where:{merchantId},select:{amount:true,locked:true}})
    if(!merchantBalance) return res.status(404).json({message:"Balance not found"})
    const availableBalnce=merchantBalance.amount-merchantBalance.locked
    return res.status(200).json({availableBalance:availableBalnce,totalBalance:merchantBalance.amount,locked:merchantBalance.locked})
})

dashboardRouter.get('/merchant/transactions',async(req:any,res:any)=>{
    const merchantId=req.userId
    const transactions=await prisma.merchantPayment.findMany({
      where:{merchantId},
      select:{id:true,userId:true,amount:true,timestamp:true,user:{select:{name:true}}},
      orderBy:{timestamp:'desc'}
    })
const merchantPayments=transactions.map((t:any)=>({id:t.id,userId:t.userId,userName:t.user?.name??null,amount:t.amount,timestamp:t.timestamp}))
return res.status(200).json({merchantPayments})
})

dashboardRouter.get('/merchant/payouts',async(req:any,res:any)=>{
  const merchantId=req.userId
  const payouts=await prisma.offRampTransaction.findMany({
    where:{merchantId},
    select:{id:true,amount:true,status:true,accountNumber:true,ifscCode:true,startedAt:true,completedAt:true},
    orderBy:{startedAt:'desc'}
  })
  return res.status(200).json({payouts})
})
