import express from 'express'
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../../../packages/middleware/src/middleware';

const qrRouter=Router()
const prisma=new PrismaClient()
qrRouter.use(express.json())
qrRouter.use(authMiddleware)

qrRouter.post('/api/qr/generate',async(req,res)=>{})

qrRouter.get('/api/qr/list',async(req,res)=>{})