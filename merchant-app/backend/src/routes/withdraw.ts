import express from 'express'
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../../../packages/middleware/src/middleware';
const manualRouter=Router()
manualRouter.use(express.json())
manualRouter.use(authMiddleware)
const prisma=new PrismaClient()

manualRouter.post('/api/merchant/withdraw',async(req,res)=>{})