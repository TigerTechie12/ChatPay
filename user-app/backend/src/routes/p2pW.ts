import express from "express";
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../../../../packages/middleware/src/middleware";
const walletPayRouter=Router()
const prisma=new PrismaClient()
import IORedis from "ioredis"
const redis=new IORedis()
walletPayRouter.post('/payAtWallet',authMiddleware,async(req,res)=>{
    const {phoneNumber,amount}=req.body
    
    const userId=req.userId
    const amountInPaise=amount*100
   try{
const userBalance= await prisma.balance.findUnique({where:{userId:userId}})
const availableBalance=userBalance.amount-userBalance.locked
if(amountInPaise>availableBalance){
    return res.status(400).json({message:"Insufficient Balance to pay"})}

    const ifRecipent=await prisma.user.findUnique({where:{number:phoneNumber}})
if(ifRecipent){
const wallet2wallettxn=await prisma.$transaction(async(txn:any)=>{
    await txn.$queryRaw`SELECT * FROM "Balance" WHERE "userId"=${userId} FOR UPDATE `
const userCurrentBalance=await txn.balance.update({where:{userId:userId},data:{amount:{decrement:{amountInPaise}}}})
const recipentCurrentBalance=await txn.balance.update({where:{number:phoneNumber},data:{amount:{increment:{amountInPaise}}}})

})
await redis.del(`profile:${userId}`)
return res.status(200).json({message:"Payment Successful to the Recipents wallet",})

}
return res.status(404).json({message:"Recipent's wallet not found with the given phone number,try here:"})

}



catch(e:any){return res.status(400).json({message:e.message})
}
})