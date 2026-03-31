import express from 'express'
import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from '../middleware/middleware'
const p2pBRouter=Router()
const prisma=new PrismaClient()

p2pBRouter.post('/payAtBank',authMiddleware,async(req,res)=>{
const {amount,provider,accountNumber,ifscCode}=req.body
const amountInPaise=amount*100
//@ts-ignore
const userId=req.userId
const userBalance = await prisma.balance.findUnique({where:{userId:userId}})
const availableBalance=userBalance.amount-userBalance.locked
if(amountInPaise>availableBalance){return res.status(400).json({message:"Insufficient Balance to pay"})}



})