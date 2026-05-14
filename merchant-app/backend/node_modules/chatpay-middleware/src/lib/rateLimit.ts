import IOredis from 'ioredis'
const redis=new IOredis()
export async function rateLimit(key:string,limit:number,windowinSec:number){

    const now=Date.now()
const windowStart=now-windowinSec*1000
const pipeline=redis.pipeline()
pipeline.zremrangebyscore(key,0,windowStart)
pipeline.zcard(key)
pipeline.zadd(key,Math.random().toString()) 
pipeline.expire(key,windowinSec)
const results:any=await pipeline.exec()

const count=results[1][1] || 0
if(count>=limit){
return {allowed:false,remaining:0,retryAfter:windowinSec}
}
return {allowed:true,remaining:limit-count-1}
}
