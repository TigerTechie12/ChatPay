"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const stripe_1 = __importDefault(require("stripe"));
const chatpay_db_1 = require("chatpay-db");
const adapter_pg_1 = require("@prisma/adapter-pg");
const shreyash_chatpay_common_1 = require("shreyash-chatpay-common");
const chatpay_middleware_1 = require("chatpay-middleware");
const redis_1 = __importDefault(require("../lib/redis"));
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new chatpay_db_1.PrismaClient({ adapter });
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '');
exports.userRouter = (0, express_1.Router)();
const onRampInput = shreyash_chatpay_common_1.OnRampSchema.pick({ amount: true });
exports.userRouter.post('/onramp', chatpay_middleware_1.authMiddleware, async (req, res) => {
    const parsed = onRampInput.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });
    const { amount } = parsed.data;
    const token = JSON.stringify(Math.floor(Math.random() * 1000000) + "xacdcdcddq" + Math.floor(Math.random() * 1000000) + "wertyuio");
    const id = req.userId;
    try {
        const dbData = await prisma.onRampTransaction.create({
            data: {
                startedAt: new Date(),
                amount: amount * 100,
                token: token,
                status: "PENDING",
                userId: id
            }
        });
        const session = await stripe.checkout.sessions.create({
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/User/dashboard/page?status=success`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/User/dashboard/page?status=cancelled`,
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
    }
    catch (e) {
        console.error('[onramp error]', e?.message, e?.type, e?.code);
        return res.status(500).json({ message: "Error creating onramp session", error: e?.message });
    }
});
exports.userRouter.get('/api/balance', chatpay_middleware_1.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const cacheKey = `profile:${userId}`;
    try {
        const cachedBalance = await redis_1.default.get(cacheKey);
        if (cachedBalance) {
            const parsed = JSON.parse(cachedBalance);
            return res.json({ ...parsed, source: 'cache' });
        }
        const dbData = await prisma.balance.findUnique({ where: { userId: userId } });
        if (dbData) {
            const payload = { balance: dbData.amount, locked: dbData.locked };
            await redis_1.default.set(cacheKey, JSON.stringify(payload), 'EX', 30);
            return res.status(200).json(payload);
        }
        return res.status(404).json({ message: "Balance not found" });
    }
    catch (e) {
        return res.status(500).json({ message: "Error fetching balance" });
    }
});
exports.userRouter.get('/transactions', chatpay_middleware_1.authMiddleware, async (req, res) => {
    const userId = req.userId;
    try {
        const [onRamp, offRamp, p2pSent, p2pReceived, merchantPayments] = await Promise.all([
            prisma.onRampTransaction.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, take: 20 }),
            prisma.offRampTransaction.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, take: 20 }),
            prisma.p2pTransfer.findMany({ where: { senderId: userId }, include: { receiver: { select: { name: true } } }, orderBy: { timestamp: 'desc' }, take: 20 }),
            prisma.p2pTransfer.findMany({ where: { receiverId: userId }, include: { sender: { select: { name: true } } }, orderBy: { timestamp: 'desc' }, take: 20 }),
            prisma.merchantPayment.findMany({ where: { userId }, include: { merchant: { select: { name: true } } }, orderBy: { timestamp: 'desc' }, take: 20 }),
        ]);
        const getInitials = (name) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
        const transactions = [
            ...onRamp.map((t) => ({ id: `onramp-${t.id}`, name: 'HDFC On-Ramp', initials: 'HO', date: t.startedAt, type: 'OnRamp', amount: t.amount, direction: 'credit', status: t.status })),
            ...offRamp.map((t) => ({ id: `offramp-${t.id}`, name: 'Withdrawal · SBI', initials: 'W', date: t.startedAt, type: 'OffRamp', amount: t.amount, direction: 'debit', status: t.status })),
            ...p2pSent.map((t) => ({ id: `p2p-sent-${t.id}`, name: t.receiver.name, initials: getInitials(t.receiver.name), date: t.timestamp, type: 'P2P', amount: t.amount, direction: 'debit', status: 'SUCCESS' })),
            ...p2pReceived.map((t) => ({ id: `p2p-recv-${t.id}`, name: t.sender.name, initials: getInitials(t.sender.name), date: t.timestamp, type: 'P2P', amount: t.amount, direction: 'credit', status: 'SUCCESS' })),
            ...merchantPayments.map((t) => ({ id: `p2m-${t.id}`, name: t.merchant.name, initials: getInitials(t.merchant.name), date: t.timestamp, type: 'P2M', amount: t.amount, direction: 'debit', status: 'SUCCESS' })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
        return res.status(200).json({ transactions });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
});
exports.userRouter.get('/monthly-stats', chatpay_middleware_1.authMiddleware, async (req, res) => {
    const userId = req.userId;
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);
    try {
        const [onRamp, offRamp, p2pSent, p2pReceived, merchantPayments] = await Promise.all([
            prisma.onRampTransaction.findMany({ where: { userId, startedAt: { gte: twelveMonthsAgo }, status: 'COMPLETED' }, select: { amount: true, startedAt: true } }),
            prisma.offRampTransaction.findMany({ where: { userId, startedAt: { gte: twelveMonthsAgo }, status: 'SUCCESS' }, select: { amount: true, startedAt: true } }),
            prisma.p2pTransfer.findMany({ where: { senderId: userId, timestamp: { gte: twelveMonthsAgo } }, select: { amount: true, timestamp: true } }),
            prisma.p2pTransfer.findMany({ where: { receiverId: userId, timestamp: { gte: twelveMonthsAgo } }, select: { amount: true, timestamp: true } }),
            prisma.merchantPayment.findMany({ where: { userId, timestamp: { gte: twelveMonthsAgo } }, select: { amount: true, timestamp: true } }),
        ]);
        const monthly = {};
        for (let i = 0; i < 12; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - 11 + i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthly[key] = { sent: 0, received: 0 };
        }
        const getKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        onRamp.forEach((t) => { const k = getKey(new Date(t.startedAt)); if (monthly[k])
            monthly[k].received += t.amount; });
        p2pReceived.forEach((t) => { const k = getKey(new Date(t.timestamp)); if (monthly[k])
            monthly[k].received += t.amount; });
        offRamp.forEach((t) => { const k = getKey(new Date(t.startedAt)); if (monthly[k])
            monthly[k].sent += t.amount; });
        p2pSent.forEach((t) => { const k = getKey(new Date(t.timestamp)); if (monthly[k])
            monthly[k].sent += t.amount; });
        merchantPayments.forEach((t) => { const k = getKey(new Date(t.timestamp)); if (monthly[k])
            monthly[k].sent += t.amount; });
        return res.status(200).json({ monthly });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
});
//# sourceMappingURL=onRamp.js.map