import express from "express";
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "../../../../packages/middleware/src/middleware";
const settingsRouter=Router()
const prisma=new PrismaClient()
settingsRouter.use(express.json())
settingsRouter.use(authMiddleware)

settingsRouter.put('/api/merchant/updateBankDetails',async(req,res)=>{
    
})