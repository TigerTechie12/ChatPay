import {Queue} from 'bullmq'
import IORedis from 'ioredis'
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null })

export const withdrawalQueue=new Queue('withdrawalQueue',{connection:redis})
