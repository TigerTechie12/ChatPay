import express from "express";
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../middleware/middleware";
const userPayRouter=Router()
const prisma=new PrismaClient()

userPayRouter.post('/pay',authMiddleware,async(req,res)=>{
    const {phoneNumber,amount}=req.body
    //@ts-ignore
    const userId=req.userId
   
    
    
})