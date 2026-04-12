import express from "express";
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../../../../packages/middleware/src/middleware";
const p2mRouter=Router()
const prisma=new PrismaClient()
p2mRouter.use(express.json())
p2mRouter.use(authMiddleware)

p2mRouter.post('/api/transfer/merchant',async(req,res)=>{
const {amount,merchantId,label}=req.body
const userId=req.userId
try{const totalAmount=await prisma.balance.findUnique({where:{userId:userId},select:{amount:true}})
const locked=await prisma.balance.findUnique({where:{userId:userId},select:{locked:true}})
const availableBalance=totalAmount?.amount! - locked?.locked!
if(availableBalance<amount*100){return res.status(400).json({message:"Insufficient balance"})}


    await prisma.$transaction(async(txn:any)=>{
    await txn.$queryRaw`SELECT * FROM "Balance" WHERE "userId"=${userId} FOR UPDATE `

 await txn.balance.update({where:{userId:userId},data:{amount:{decrement:{amount:amount*100}}}})
await txn.merchantBalance.update({where:{merchantId:merchantId},data:{amount:{increment:{amount:amount*100}}}})
res.status(200).json({message:"Payment Successful to the Merchant"})
})}
catch(e:any){return res.status(400).json({message:e.message})

}})
