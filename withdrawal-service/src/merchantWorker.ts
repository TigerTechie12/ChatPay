import {Worker,Job} from 'bullmq'
import IORedis from 'ioredis'
import {PrismaClient} from 'chatpay-db'
import axios from 'axios'

const redisConnection = new IORedis()
const prisma=new PrismaClient()

const worker=new Worker('merchantWithdrawalQueue',async(job:Job)=>{
    await job.updateProgress(10)
const jobId=job.id
    const offRampTxn=await prisma.offRampTransaction.findUnique({where:{
    id:jobId
 }})

const response=await axios.post('https://api.razorpay.com/v1/payouts',{currency:'INR',
    mode:'IMPS',
    purpose:'payout',
    amount:offRampTxn.amount,
    provider:offRampTxn.provider,
    accountNumber:offRampTxn.accountNumber,
    ifscCode:offRampTxn.ifscCode
})
const updateDB=await prisma.offRampTransaction.update({where:{id:jobId},data:{status:'PROCESSING'}})
await job.updateProgress(50)

const merchantId=offRampTxn.merchantId
const balance=await prisma.merchantBalance.findUnique({where:{merchantId:merchantId}})
if(response.data.status==='SUCCESS'){
    await prisma.$transaction(async(txn:any)=>{
const updateBalance=await txn.merchantBalance.update({where:{merchantId:merchantId},
data:{decrement:{amount:offRampTxn.amount},locked:{decrement:{amount:offRampTxn.amount}}}})
    })
    await prisma.offRampTransaction.update({where:{id:jobId},data:{status:'SUCCESS',completedAt:new Date()}})
}
await job.updateProgress(100)
if(response.data.status==='FAILED'){
    await prisma.offRampTransaction.update({where:{id:jobId},data:{status:'RETRYPENDING'}})
throw new Error('OffRamp Transaction Failed,Marked for Retry')
}

})
worker.run()
worker.on('completed',(job:Job,returnvalue:any)=>{
    console.log(`Job ${job.id} completed successfully!`)
})

worker.on('progress',(job:Job,progress:any)=>{
console.log(`Job ${job.id} is ${progress}% complete.`)
})

worker.on('failed',async(job: Job | undefined, error: Error, prev: string)=>{
if(job?.attemptsMade ==job?.opts.attempts!){console.log(`Job ${job.id} has completely exhausted all retries!`)
}
const dbData=await prisma.offRampTransaction.findUnique({where:{id:job?.id}})
const merchantId=dbData?.merchantId
await prisma.$transaction(async(txn:any)=>{
    await prisma.merchantBalance.update({where:{merchantId:merchantId},
data:{locked:{decrement:{amount:dbData?.amount!}}}})
    })

    await prisma.offRampTransaction.update({where:{id:job?.id},data:{status:'FAILED',completedAt:new Date()}})
})

worker.on('error', err => {
  console.error(err)
})
