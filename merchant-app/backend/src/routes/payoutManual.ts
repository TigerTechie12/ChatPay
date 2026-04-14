import express from 'express'
import IOredis from 'ioredis'
import { PrismaClient } from '@prisma/client';
import { Router } from 'express';
const prisma=PrismaClient()
const redis=new IOredis()
import { merchantWithdrawalQueue } from '../lib/queue';
const payOutRouter=Router()

payOutRouter.post('/api/merchant/manual/withdraw',async(req,res)=>{
    const {amount, provider,accountNumber,ifscCode}=req.body
    const amountInPaise=amount*100
    const merchantId=req.userId
try{
await prisma.$transaction(async(txn:any)=>{
    await txn.$queryRaw`SELECT * FROM "MerchantBalance" WHERE "userId"=${merchantId} FOR UPDATE `
const balance=await prisma.merchantBalance.findUnique({where:merchantId})
const lockedBalance=balance.locked
const amountInDb=balance.amount
const availableBalance=lockedBalance-amountInDb
if(availableBalance<amountInPaise){return res.status(400).json({message:"Invalid Transaction"})}
const dbUpdate=await prisma.merchantBalance.update({where:{merchantId:merchantId}, data:{
    locked:{increment:lockedBalance}
}})
const offRampTxn=await prisma.offRampTransaction.create({data:{
    amount:amountInPaise,
    provider:provider,
    accountNumber:accountNumber,
    ifscCode:ifscCode,
    merchantId:merchantId,
    status:'QUEUED'
}})


await merchantWithdrawalQueue.add('offRampTxn',{offRampTxnId:offRampTxn.id},{removeOnComplete:true,removeOnFail:{age:24*3600},attempts:5,backoff:{type:'fixed',delay:10000}},)
await merchantWithdrawalQueue.setGlobalRateLimit(1,1000)
res.json({message:'Withdrawal Request Queued',
id:offRampTxn.id
})
})
}
catch(e){res.status(400).json({message:"SOmething went wrong"})}
})