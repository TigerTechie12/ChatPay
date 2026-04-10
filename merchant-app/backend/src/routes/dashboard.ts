import express from 'express'
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../../../packages/middleware/src/middleware';
const dashboardRouter=Router()
const prisma=new PrismaClient()
dashboardRouter.use(express.json())
dashboardRouter.use(authMiddleware)

dashboardRouter.get('/api/merchant/balance',async(req,res)=>{})

dashboardRouter.get('/api/merchant/transactions',async(req,res)=>{})

dashboardRouter.get('/api/merchant/payouts',async(req,res)=>{})