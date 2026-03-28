import express from "express";
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware/middleware";

const prisma = new PrismaClient();
export const offRampRouter = Router();
offRampRouter.use(express.json());
offRampRouter.post("/offramp", authMiddleware, async(req, res) => {
const {amount, provider,accountNumber,ifscCode}=req.body
//@ts-ignore
const userId:any=req.userId 
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

const offRampTxn=await txn.offRampTransaction.create({data:{
    status:'QUEUED',
    amount:amount*100,
    provider:provider,
    userId:userId,
    accountNumber:accountNumber,
    ifscCode:ifscCode,
    startedAt:new Date(),

}}) 

res.json({message:'Withdrawal Request Queued',
id:offRampTxn.id
})

})}catch(e:any){return res.status(400).json({message:e.message})}



})