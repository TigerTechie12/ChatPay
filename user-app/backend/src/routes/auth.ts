import { Router } from 'express'
import { PrismaClient } from 'chatpay-db'
import {PrismaPg} from '@prisma/adapter-pg'
import {UserSchema} from 'shreyash-chatpay-common'
import jwt from 'jsonwebtoken'
export const router=Router()
const adapter=new PrismaPg({connectionString:process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})
import IORedis from 'ioredis'
import { authMiddleware } from 'chatpay-middleware'

const JWT_SECRET=process.env.JWT_SECRET || ""
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null })

router.post('/signup',async(req,res)=>{
  const name=req.body.name
  const email=req.body.email
  const password=req.body.password
  const number=req.body.number
  try{
    const userExists=await prisma.user.findUnique({
        where:{email:email,
            number:number
        }
    })
    if(userExists){
     return   res.json({message:"User already exists"})
    }
    const userCreate=await prisma.user.create({
        data:{
            name:name,
            email:email,
            password:password,
            number:number
        }
    })

res.status(200).json({message:"User created"})
}
  catch(e){message:"Error creating user"}
})
router.post('/signin',async(req,res)=>{
const email=req.body.email
const password=req.body.password
const name=req.body.name
try{ const user:any=await prisma.user.findUnique({
    where:{email:email,name:name}
})
if(!user){return res.json({message:"User not found"})}
const userId=user.id
const now=new Date()
const minutes=now.getMinutes()
const token=jwt.sign({name:name,password:password,email:email,userId,time:minutes, exp: Math.floor(Date.now() / 1000) + (60 * 60)},JWT_SECRET)
res.status(200).json({message:"User created",token:token})

}

catch(e){
    return res.json({message:"Error signing in user"})
}})

router.post('/signout',authMiddleware,async(req,res)=>{
 const userId=req.userId
    const now=new Date()
const timeNow=now.getMinutes()
const time:number | undefined=req.time
const expiredTime=req.exp
if(timeNow-time!<expiredTime!){
await redis.set(`blacklist:${req.userId}`, 'true', 'EX', expiredTime! - (timeNow - time!))
}
})
