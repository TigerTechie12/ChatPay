import {Queue} from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {maxRetriesPerRequest: null})
connection.on('error', (err) => console.error('[queue-redis]', err.message))

export const withdrawalQueue = new Queue('withdrawalQueue', {connection})
withdrawalQueue.on('error', (err) => console.error('[queue]', err.message))
