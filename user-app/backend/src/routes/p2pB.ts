import express from 'express'
import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../../../../packages/middleware/src/middleware'
import { withdrawalQueue } from '../lib/queue'
const p2pBRouter=Router()
const prisma=new PrismaClient()
import IORedis from 'ioredis'
const redis=new IORedis()
p2pBRouter.post('/payAtBank',authMiddleware,async(req,res)=>{
const {amount,provider,accountNumber,ifscCode}=req.body
const amountInPaise=amount*100

const userId=req.userId
const cacheKey=`profile:${userId}`

try{
const userBalance = await prisma.balance.findUnique({where:{userId:userId}})
const availableBalance=userBalance.amount-userBalance.locked
if(amountInPaise>availableBalance){return res.status(400).json({message:"Insufficient Balance to pay"})}
await prisma.$transaction(async(txn:any)=>{

    await txn.$queryRaw`SELECT * FROM "Balance" WHERE "userId"=${userId} FOR UPDATE`

const lockedAmount=await txn.balance.update({where:{userId:userId},data:{locked:{increment:amountInPaise}}})
await redis.del(cacheKey)
const offRampTxn=await txn.offRampTransaction.create({data:{
    amount:amountInPaise,
    provider:provider,
    accountNumber:accountNumber,
    ifscCode:ifscCode,
    status:'QUEUED',
    userId:userId,
    startedAt:new Date()
}})
const offRampId=offRampTxn.id
await withdrawalQueue.add('p2pOffRampTxn',{offRampId:offRampId},{removeOnComplete:true,removeOnFail:{age:24*3600}})
await withdrawalQueue.setGlobalRateLimit(1,1000)
return res.status(200).json({message:"Bank Payment Initiated",offRampId:offRampId})

})}
catch(e:any){return res.status(400).json({message:e.message})}

})
