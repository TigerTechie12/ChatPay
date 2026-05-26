import { rateLimit } from "./lib/rateLimit"
export async function rateLimiter(prefix:string,limit:number,windowinSec:number){
return async function(req:any,res:any,next:any){
const key=`${prefix}:${req.userId || req.ip} `
const result=await rateLimit(key,limit,windowinSec)
if(!result.allowed){
    return res.status(429).json({message:"Too Many Requests",retryAfter:result.retryAfter})
}
res.set('X-RateLimit-Limit',String(result.remaining))
next()
}
}
