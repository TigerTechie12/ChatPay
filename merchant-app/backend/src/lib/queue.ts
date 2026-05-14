import {Queue} from 'bullmq'
import IORedis from 'ioredis'
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {maxRetriesPerRequest: null})
connection.on('error', (err) => console.error('[queue-redis]', err.message))
export const merchantWithdrawalQueue=new Queue('merchantWithdrawalQueue',{connection:connection})
merchantWithdrawalQueue.on('error', (err) => console.error('[queue]', err.message))
