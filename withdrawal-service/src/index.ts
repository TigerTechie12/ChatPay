import {Worker,Job} from 'bullmq';
import IORedis from 'ioredis';
import {PrismaClient} from '@prisma/client';
import {withdrawalQueue} from './lib/queue'
import axios from 'axios';

const redisConnection = new IORedis()

const prisma=new PrismaClient()

const worker=new Worker('withdrawalQueue',async(job:Job)=>{
    await job.updateProgress(10)
const jobId=job.id
    const offRampTxn=await prisma.offRamp.findUnique({where:{
    id:jobId
 }})
 
if(offRampTxn.status === 'SUCCESS'){
return 

} 
const response=await axios.post('',{currency:'INR',
    mode:'IMPS',
    purpose:'payout',
    amount:offRampTxn.amount,
    provider:offRampTxn.provider,
    accountNumber:offRampTxn.accountNumber,
    ifscCode:offRampTxn.ifscCode
})
const updateDB=await prisma.update({where:{id:jobId},data:{status:'PROCESSING'}})
await job.updateProgress(50)

const userId=offRampTxn.userId
const balance=await prisma.balance.findUnique({where:{userId:userId}})
if(response.data.status==='SUCCESS'){
    await prisma.$transaction(async(txn:any)=>{
const updateBalance=await txn.balance.update({where:{userId:userId},
data:{decrement:{amount:offRampTxn.amount},locked:{decrement:{amount:offRampTxn.amount}}}})
    })
    await prisma.offRamp.update({where:{id:jobId},data:{status:'SUCCESS',completedAt:new Date()}})
}
await job.updateProgress(100)
if(response.data.status==='FAILED'){
    await prisma.offRamp.update({where:{id:jobId},data:{status:'RETRYPENDING'}})
throw new Error('OffRamp Transaction Failed,Marked for Retry')
}

})
worker.run()
