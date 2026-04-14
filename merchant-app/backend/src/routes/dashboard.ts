import express from 'express'
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../../../packages/middleware/src/middleware';
const dashboardRouter=Router()
const prisma=new PrismaClient()
dashboardRouter.use(express.json())
dashboardRouter.use(authMiddleware)

dashboardRouter.get('/api/merchant/balance',async(req,res)=>{
    const merchantId=req.userId
    const merchantBalance=await prisma.merchantBalance.findUnique({where:{merchantId},select:{amount:true,locked:true}})
const availableBalnce=merchantBalance.amount-merchantBalance.locked
return res.status(200).json({availableBalance:availableBalnce,totalBalance:merchantBalance.amount,locked:merchantBalance.locked})
})

dashboardRouter.get('/api/merchant/transactions',async(req,res)=>{
    const merchantId=req.userId
    const transactions=await prisma.merchantPayment.findMany({where:{merchantId},select:{userId:true,amount:true,timestamp:true}})

const merchantPayments=transactions.map((t:any)=>{t.userId,t.amount,t.timestamp})

return res.status(200).json({merchantPayments})
})

dashboardRouter.get('/api/merchant/payouts',async(req,res)=>{})