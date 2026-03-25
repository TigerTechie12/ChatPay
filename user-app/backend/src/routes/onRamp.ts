import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { Router } from 'express';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
export const userRouter = Router();
import { authMiddleware } from '../middleware/middleware';

userRouter.post('/onramp', authMiddleware, async (req, res) => {
    const { provider, amount } = req.body;
    const token = JSON.stringify(Math.floor(Math.random() * 1000000) + "xacdcdcddq" + Math.floor(Math.random() * 1000000) + "wertyuio");

    const headers = req.headers.authorization;
    const jwtToken = headers!.split(' ')[1];
    const decode = jwt.decode(jwtToken || '') as { userId: number } | null;
    const id = decode?.userId;

    const dbData = await prisma.onRampTransaction.create({
        data: {
            provider: provider,
            amount: amount * 100,
            token: token,
            status: "PROCESSING",
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


