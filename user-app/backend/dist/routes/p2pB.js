"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.p2pBRouter = void 0;
const express_1 = require("express");
const chatpay_db_1 = require("chatpay-db");
const adapter_pg_1 = require("@prisma/adapter-pg");
const chatpay_middleware_1 = require("chatpay-middleware");
const rateLimiter_1 = require("../lib/rateLimiter");
const queue_1 = require("../lib/queue");
const redis_1 = __importDefault(require("../lib/redis"));
const zod_1 = require("zod");
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new chatpay_db_1.PrismaClient({ adapter });
exports.p2pBRouter = (0, express_1.Router)();
const bankInput = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    accountNumber: zod_1.z.string().min(1),
    ifscCode: zod_1.z.string().min(1)
});
const bankLimiter = (0, rateLimiter_1.rateLimitMiddleware)('p2p-bank', 3, 60);
exports.p2pBRouter.post('/payAtBank', chatpay_middleware_1.authMiddleware, bankLimiter, async (req, res) => {
    const parsed = bankInput.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });
    const { amount, accountNumber, ifscCode } = parsed.data;
    const amountInPaise = amount * 100;
    const userId = req.userId;
    const cacheKey = `profile:${userId}`;
    try {
        const userBalance = await prisma.balance.findUnique({ where: { userId } });
        if (!userBalance)
            return res.status(404).json({ message: "Balance not found" });
        const availableBalance = userBalance.amount - userBalance.locked;
        if (amountInPaise > availableBalance)
            return res.status(400).json({ message: "Insufficient Balance" });
        await prisma.$transaction(async (txn) => {
            await txn.$queryRaw `SELECT * FROM "Balance" WHERE "userId"=${userId} FOR UPDATE`;
            await txn.balance.update({ where: { userId }, data: { locked: { increment: amountInPaise } } });
            await redis_1.default.del(cacheKey);
            const offRampTxn = await txn.offRampTransaction.create({ data: {
                    amount: amountInPaise,
                    accountNumber,
                    ifscCode,
                    status: 'QUEUED',
                    userId,
                    startedAt: new Date()
                } });
            await queue_1.withdrawalQueue.add('p2pOffRampTxn', { offRampTxnId: offRampTxn.id }, {
                jobId: String(offRampTxn.id),
                removeOnComplete: true,
                removeOnFail: { age: 24 * 3600 },
                attempts: 5,
                backoff: { type: 'fixed', delay: 10000 }
            });
            res.status(200).json({ message: "Bank Payment Initiated", offRampId: offRampTxn.id });
        });
    }
    catch (e) {
        return res.status(400).json({ message: e.message });
    }
});
//# sourceMappingURL=p2pB.js.map