import jwt from 'jsonwebtoken'
import { Router } from 'express'
import Stripe from 'stripe'
import { PrismaClient } from 'chatpay-db'
import {PrismaPg} from '@prisma/adapter-pg'
const adapter=new PrismaPg({connectionString:process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
export const userRouter = Router()
import { authMiddleware } from 'chatpay-middleware'
import IORedis from 'ioredis'
const redis = new IORedis()

userRouter.post('/onramp', authMiddleware, async (req, res) => {
    const { amount } = req.body
    const token = JSON.stringify(Math.floor(Math.random() * 1000000) + "xacdcdcddq" + Math.floor(Math.random() * 1000000) + "wertyuio")

    const headers = req.headers.authorization
    const jwtToken = headers!.split(' ')[1]
    const decode = jwt.decode(jwtToken || '') as { userId: number } | null
    const id = decode?.userId

    const dbData = await prisma.onRampTransaction.create({
        data: {
            startedAt:new Date(),
            amount: amount * 100,
            token: token,
            status: "PENDING",
            userId: id
        }
    })

    const session = await stripe.checkout.sessions.create({
        success_url: 'http://localhost:3000/dashboard?status=success',
        cancel_url: 'http://localhost:3000/dashboard?status=cancelled',
        line_items: [{
            price_data: {
                currency: 'inr',
                product_data: { name: 'ChatPay Wallet Top-up' },
                unit_amount: amount * 100,
            },
            quantity: 1,
        }],
        mode: 'payment',
        metadata: { token: token },
    })

    return res.status(200).json({ message: "Onramp transaction created", data: dbData, token: token, url: session.url })
})

userRouter.get('/api/balance',authMiddleware,async(req:any,res:any)=>{
const userId=req.userId
const cacheKey=`profile:${userId}`
try{
const cachedBalance=await redis.get(cacheKey)
if(cachedBalance){
    const parsed=JSON.parse(cachedBalance)
    return res.json({...parsed,source:'cache'})
}
const dbData=await prisma.balance.findUnique({where:{userId:userId}})
if(dbData){
const payload={balance:dbData.amount,locked:dbData.locked}
await redis.set(cacheKey,JSON.stringify(payload), 'EX', 30)
return res.status(200).json(payload)
}
return res.status(404).json({message:"Balance not found"})
}
catch(e){return res.status(500).json({message:"Error fetching balance"})}
})

userRouter.get('/transactions',authMiddleware,async(req:any,res:any)=>{
const userId=req.userId
try{
const [onRamp,offRamp,p2pSent,p2pReceived,merchantPayments]=await Promise.all([
  prisma.onRampTransaction.findMany({where:{userId},orderBy:{startedAt:'desc'},take:20}),
  prisma.offRampTransaction.findMany({where:{userId},orderBy:{startedAt:'desc'},take:20}),
  prisma.p2pTransfer.findMany({where:{senderId:userId},include:{receiver:{select:{name:true}}},orderBy:{timestamp:'desc'},take:20}),
  prisma.p2pTransfer.findMany({where:{receiverId:userId},include:{sender:{select:{name:true}}},orderBy:{timestamp:'desc'},take:20}),
  prisma.merchantPayment.findMany({where:{userId},include:{merchant:{select:{name:true}}},orderBy:{timestamp:'desc'},take:20}),
])

const getInitials=(name:string)=>name.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2)

const transactions=[
  ...onRamp.map((t:any)=>({id:`onramp-${t.id}`,name:'HDFC On-Ramp',initials:'HO',date:t.startedAt,type:'OnRamp',amount:t.amount,direction:'credit',status:t.status})),
  ...offRamp.map((t:any)=>({id:`offramp-${t.id}`,name:'Withdrawal · SBI',initials:'W',date:t.startedAt,type:'OffRamp',amount:t.amount,direction:'debit',status:t.status})),
  ...p2pSent.map((t:any)=>({id:`p2p-sent-${t.id}`,name:t.receiver.name,initials:getInitials(t.receiver.name),date:t.timestamp,type:'P2P',amount:t.amount,direction:'debit',status:'SUCCESS'})),
  ...p2pReceived.map((t:any)=>({id:`p2p-recv-${t.id}`,name:t.sender.name,initials:getInitials(t.sender.name),date:t.timestamp,type:'P2P',amount:t.amount,direction:'credit',status:'SUCCESS'})),
  ...merchantPayments.map((t:any)=>({id:`p2m-${t.id}`,name:t.merchant.name,initials:getInitials(t.merchant.name),date:t.timestamp,type:'P2M',amount:t.amount,direction:'debit',status:'SUCCESS'})),
].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).slice(0,10)

return res.status(200).json({transactions})
}catch(e:any){return res.status(500).json({message:e.message})}
})

userRouter.get('/monthly-stats',authMiddleware,async(req:any,res:any)=>{
const userId=req.userId
const twelveMonthsAgo=new Date()
twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth()-11)
twelveMonthsAgo.setDate(1)
twelveMonthsAgo.setHours(0,0,0,0)

try{
const [onRamp,offRamp,p2pSent,p2pReceived,merchantPayments]=await Promise.all([
  prisma.onRampTransaction.findMany({where:{userId,startedAt:{gte:twelveMonthsAgo},status:'COMPLETED'},select:{amount:true,startedAt:true}}),
  prisma.offRampTransaction.findMany({where:{userId,startedAt:{gte:twelveMonthsAgo},status:'SUCCESS'},select:{amount:true,startedAt:true}}),
  prisma.p2pTransfer.findMany({where:{senderId:userId,timestamp:{gte:twelveMonthsAgo}},select:{amount:true,timestamp:true}}),
  prisma.p2pTransfer.findMany({where:{receiverId:userId,timestamp:{gte:twelveMonthsAgo}},select:{amount:true,timestamp:true}}),
  prisma.merchantPayment.findMany({where:{userId,timestamp:{gte:twelveMonthsAgo}},select:{amount:true,timestamp:true}}),
])

const monthly:Record<string,{sent:number,received:number}>={}
for(let i=0;i<12;i++){
  const d=new Date()
  d.setMonth(d.getMonth()-11+i)
  const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
  monthly[key]={sent:0,received:0}
}
const getKey=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`

onRamp.forEach((t:any)=>{const k=getKey(new Date(t.startedAt));if(monthly[k])monthly[k].received+=t.amount})
p2pReceived.forEach((t:any)=>{const k=getKey(new Date(t.timestamp));if(monthly[k])monthly[k].received+=t.amount})
offRamp.forEach((t:any)=>{const k=getKey(new Date(t.startedAt));if(monthly[k])monthly[k].sent+=t.amount})
p2pSent.forEach((t:any)=>{const k=getKey(new Date(t.timestamp));if(monthly[k])monthly[k].sent+=t.amount})
merchantPayments.forEach((t:any)=>{const k=getKey(new Date(t.timestamp));if(monthly[k])monthly[k].sent+=t.amount})

return res.status(200).json({monthly})
}catch(e:any){return res.status(500).json({message:e.message})}
})
