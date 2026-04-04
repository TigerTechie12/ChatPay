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
worker.on('completed',(job:Job,returnvalue:any)=>{
    console.log(`Job ${job.id} completed successfully!`);
})

worker.on('progress',(job:Job,progress:any)=>{
console.log(`Job ${job.id} is ${progress}% complete.`);
})

worker.on('failed',async(job: Job | undefined, error: Error, prev: string)=>{
if(job?.attemptsMade ==job?.opts.attempts!){console.log(`Job ${job.id} has completely exhausted all retries!`);
}
const dbData=await prisma.offRamp.findUnique({where:{id:job?.id}})
const userId=dbData?.userId
await prisma.$transaction(async(txn:any)=>{
    await prisma.balance.update({where:{userId:userId},
data:{locked:{decrement:{amount:dbData?.amount!}}}})
    })

    await prisma.offRamp.update({where:{id:job?.id},data:{status:'FAILED',completedAt:new Date()}})
})
 

worker.on('error', err => {
  
  console.error(err);
});