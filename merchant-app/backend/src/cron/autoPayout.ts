import express from 'express'
import IOredis from 'ioredis'
import { PrismaClient } from '@prisma/client';
const prisma=PrismaClient()
const redis=new IOredis()
import cron from 'node-cron'
import { merchantWithdrawalQueue } from '../lib/queue';

cron.schedule("0 2 */2 * *",async()=>{
redis.set(key,value,'EX',3600,'NX')
try{const merchantBalance=await prisma.merchantBalance.findUnique({where:{merchantId:merchantId}})
if(merchantBalance.balance==0){return}
const balance=merchantBalance.balance
const merchantDetails=await prisma.merchant.findUnique({where:{merchantId:merchantId}})
const bankAccountNumber=merchantDetails.bankAccountNumber
const bankIfscCode=merchantDetails.bankIfscCode
const bankAccountName=merchantDetails.bankAccountName

const offRampTxn=await prisma.offRampTransaction.findUnique({where:{merchantId:merchantId}})
if(offRampTxn.status==='QUEUED' || 'PROCESSING' || 'RETRYPENDING'){return}
await prisma.$transaction(async(txn:any)=>{
    await txn.$queryRaw`SELECT * FROM "MerchantBalance" WHERE "merchantId"=${merchantId} FOR UPDATE `
await prisma.merchantBalance.update({where:{merchantId:merchantId},data:{
    locked:{increment:{balance}}}
})
await prisma.offRampTransaction.create({
status:'QUEUED',
amount:balance,
merchantId:merchantId,
bankAccountName:bankAccountName,
bankAccountNumber:bankAccountNumber,
bankIfscCode:bankIfscCode,
startedAt:Date.now()
})
await merchantWithdrawalQueue.add('offRampTxn',{offRampTxnId:offRampTxn.id},{removeOnComplete:true,removeOnFail:{age:24*3600},attempts:5,backoff:{type:'fixed',delay:10000}},)
await merchantWithdrawalQueue.setGlobalRateLimit(1,1000)

})

}
catch(e){}


})