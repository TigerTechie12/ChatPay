import express from "express";
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware/middleware";
import {withdrawalQueue} from '../lib/queue'
import IORedis from "ioredis";
const redis=new IORedis()
const prisma = new PrismaClient();
export const offRampRouter = Router();
offRampRouter.use(express.json());
offRampRouter.post("/offramp", authMiddleware, async(req, res) => {
const {amount, provider,accountNumber,ifscCode}=req.body

const userId:any=req.userId 
const cacheKey=`profile:${userId}`
try{
const offRampOperation=await prisma.$transaction(async(txn:any)=>{
    await txn.$queryRaw`SELECT * FROM "Balance" WHERE "userId"=${userId} FOR UPDATE `
const balance=await txn.balance.findUnique({where:{userId:userId}})
if(!balance){
    return res.status(404).json({message:"Balance not found"})

}
const availableBalance=balance.amount-balance.locked
if(availableBalance<amount*100){ throw new Error('Insufficient Balance')}


const updateDB=await txn.balance.update({where:{userId:userId},data:{locked:{increment:amount*100}}})
await redis.del(cacheKey)
const offRampTxn=await txn.offRampTransaction.create({data:{
    status:'QUEUED',
    amount:amount*100,
    provider:provider,
    userId:userId,
    accountNumber:accountNumber,
    ifscCode:ifscCode,
    startedAt:new Date(),

}}) 

await withdrawalQueue.add('offRampTxn',{offRampTxnId:offRampTxn.id},{removeOnComplete:true,removeOnFail:{age:24*3600},attempts:5,backoff:{type:'fixed',delay:10000}},)
await withdrawalQueue.setGlobalRateLimit(1,1000)
res.json({message:'Withdrawal Request Queued',
id:offRampTxn.id
})

})}catch(e:any){return res.status(400).json({message:e.message})}



})