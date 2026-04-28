import jwt from 'jsonwebtoken'
const JWT_SECRET=process.env.JWT_SECRET || ""
import type { Request,Response,NextFunction } from 'express'
import IORedis from 'ioredis'
const redis=new IORedis()

export async function authMiddleware(req:Request,res:Response,next:NextFunction):Promise<void>{
const headers=req.headers.authorization
if(!headers || !headers.startsWith("Bearer")){
    res.json({message:"Unauthorized"})
    return
}
const token=headers.split(' ')[1]
if(!token){
    res.status(401).json({message:"Unauthorized"})
    return
}

try{
    const ifUser=jwt.verify(token,JWT_SECRET) as {userId:string,exp:number,time:number}
    req.userId=ifUser.userId
    req.time=ifUser.time
    req.exp=ifUser.exp
   const checkCache=await redis.get(`blacklist:${ifUser.userId}`)
   if(checkCache){res.status(401).json({message:"Unauthorized"}); return}
    next()
}catch{
    res.status(401).json({message:"Unauthorized"})
}}
