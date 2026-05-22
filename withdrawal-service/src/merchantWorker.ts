import {Worker,Job} from 'bullmq'
import IORedis from 'ioredis'
import {PrismaClient} from 'chatpay-db'
import {PrismaPg} from '@prisma/adapter-pg'
import axios from 'axios'

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null })
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma=new PrismaClient({ adapter })

const worker=new Worker('merchantWithdrawalQueue',async(job:Job)=>{
    await job.updateProgress(10)
    const id=job.data.offRampTxnId
    if(!id) throw new Error('Job has no offRampTxnId')
    const offRampTxn=await prisma.offRampTransaction.findUnique({where:{id}})
    if(!offRampTxn) throw new Error(`OffRamp transaction ${id} not found`)

    const response=await axios.post('https://api.razorpay.com/v1/payouts',{currency:'INR',
        mode:'IMPS',
        purpose:'payout',
        amount:offRampTxn.amount,
        accountNumber:offRampTxn.accountNumber,
        ifscCode:offRampTxn.ifscCode
    })
    await prisma.offRampTransaction.update({where:{id},data:{status:'PROCESSING'}})
    await job.updateProgress(50)

    const merchantId=offRampTxn.merchantId
    if(!merchantId) throw new Error('No merchant associated with this transaction')
    if(response.data.status==='SUCCESS'){
        await prisma.$transaction(async(txn:any)=>{
            await txn.merchantBalance.update({where:{merchantId},
                data:{amount:{decrement:offRampTxn.amount},locked:{decrement:offRampTxn.amount}}})
        })
        await prisma.offRampTransaction.update({where:{id},data:{status:'SUCCESS',completedAt:new Date()}})
    }
    await job.updateProgress(100)
    if(response.data.status==='FAILED'){
        await prisma.offRampTransaction.update({where:{id},data:{status:'RETRYPENDING'}})
        throw new Error('OffRamp Transaction Failed,Marked for Retry')
    }
},{ connection: redisConnection })

worker.on('completed',(job:Job,returnvalue:any)=>{
    console.log(`Job ${job.id} completed successfully!`)
})

worker.on('progress',(job:Job,progress:any)=>{
    console.log(`Job ${job.id} is ${progress}% complete.`)
})

worker.on('failed',async(job: Job | undefined, error: Error, prev: string)=>{
    if(job?.attemptsMade===job?.opts.attempts){
        console.log(`Job ${job?.id} has completely exhausted all retries!`)
    }
    if(!job?.data?.offRampTxnId) return
    const id=job.data.offRampTxnId
    const dbData=await prisma.offRampTransaction.findUnique({where:{id}})
    if(!dbData) return
    const merchantId=dbData.merchantId
    if(!merchantId) return
    await prisma.$transaction(async(txn:any)=>{
        await txn.merchantBalance.update({where:{merchantId},
            data:{locked:{decrement:dbData.amount}}})
    })
    await prisma.offRampTransaction.update({where:{id},data:{status:'FAILED',completedAt:new Date()}})
})

worker.on('error', err => {
    console.error(err)
})
