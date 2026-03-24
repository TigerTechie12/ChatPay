import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken'
import { Router } from 'express';
const prisma = new PrismaClient();
export const userRouter=Router()
import { authMiddleware } from '../middleware/middleware';
userRouter.post('/onramp',authMiddleware,async(req,res)=>{
    const {provider,amount}=req.body
const token=JSON.stringify("xacdcdcddq"+Math.floor(Math.random()*100000)+"wertyuio")
const dbData=await prisma.onRampTransaction.create({
    data:{
        provider:provider,
        amount:amount,
    token:token,
status:"PROCESSING",
userId:}
})
})


