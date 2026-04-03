import {Worker,Job} from 'bullmq';
import IORedis from 'ioredis';
import {PrismaClient} from '@prisma/client';
import {withdrawalQueue} from './lib/queue'

const redisConnection = new IORedis()

const prisma=new PrismaClient()

const worker=new Worker('withdrawalQueue',async(job:Job)=>{
const jobId=job.id
    
})
worker.run()
