
import jwt from 'jsonwebtoken';
import { Router } from 'express';
import Stripe from 'stripe';

import { PrismaClient } from 'chatpay-db';
import {PrismaPg} from '@prisma/adapter-pg'
const adapter=new PrismaPg({connectionString:process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter});
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
export const userRouter = Router();
import { authMiddleware } from 'chatpay-middleware';
import IORedis from 'ioredis';
const redis = new IORedis()
userRouter.post('/onramp', authMiddleware, async (req, res) => {
    const { amount } = req.body;
    const token = JSON.stringify(Math.floor(Math.random() * 1000000) + "xacdcdcddq" + Math.floor(Math.random() * 1000000) + "wertyuio");

    const headers = req.headers.authorization;
    const jwtToken = headers!.split(' ')[1];
    const decode = jwt.decode(jwtToken || '') as { userId: number } | null;
    const id = decode?.userId;
    
    const dbData = await prisma.onRampTransaction.create({
        data: {
            startedAt:new Date(),     
            amount: amount * 100,
            token: token,
            status: "PENDING",
            userId: id
                        
        }
    });

    const session = await stripe.checkout.sessions.create({
        success_url: 'http://localhost:3000/dashboard?status=success',
        cancel_url: 'http://localhost:3000/dashboard?status=cancelled',
        line_items: [{
            price_data: {
                currency: 'inr',
                product_data: { name: 'ChatPay Wallet Top-up' },
                unit_amount: amount * 100,
            },
            quantity: 1,
        }],
        mode: 'payment',
        metadata: { token: token },
    });

    return res.status(200).json({ message: "Onramp transaction created", data: dbData, token: token, url: session.url });
})

userRouter.get('/api/balance',authMiddleware,async(req:any,res:any)=>{
const userId=req.userId
const cacheKey=`profile:${userId}`

try{const cachedBalance=await redis.get(cacheKey)
if(cachedBalance){
    return res.json({balance:cachedBalance,source:'cache'})
}
const dbData=await prisma.balance.findUnique({where:{userId:userId}})
const balance=dbData.amount
if(balance){
const data=await redis.set(cacheKey,JSON.stringify(balance), 'EX', 30)

return res.status(200).json({balance:balance})
}

}

catch(e){return res.status(500).json({message:"Error fetching balance"})}
})