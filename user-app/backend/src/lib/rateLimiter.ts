import redis from './redis'

export function rateLimitMiddleware(prefix: string, limit: number, windowSec: number) {
  return async (req: any, res: any, next: any) => {
    const key = `rl:${prefix}:${(req.userId as string | undefined) ?? (req.ip as string | undefined) ?? 'unknown'}`
    const now = Date.now()
    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(key, 0, now - windowSec * 1000)
    pipeline.zcard(key)
    pipeline.zadd(key, now, `${now}-${Math.random()}`)
    pipeline.expire(key, windowSec)
    try {
      const results: any = await pipeline.exec()
      const count: number = (results[1] as any)?.[1] ?? 0
      if (count >= limit) {
        res.status(429).json({message: 'Too many requests', retryAfter: windowSec})
        return
      }
    } catch {
    }
    next()
  }
}
