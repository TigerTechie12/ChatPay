import express from 'express'
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../../../packages/middleware/src/middleware';
const authRouter=Router()
const prisma=new PrismaClient()

authRouter.post('/api/auth/google',async(req,res)=>{})