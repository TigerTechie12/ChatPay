import IORedis from 'ioredis'

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {maxRetriesPerRequest: null})
redis.on('error', (err) => console.error('[redis]', err.message))

export default redis
