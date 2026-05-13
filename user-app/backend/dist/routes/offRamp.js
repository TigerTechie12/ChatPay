"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.offRampRouter = void 0;
const express_1 = __importDefault(require("express"));
const express_2 = require("express");
const chatpay_db_1 = require("chatpay-db");
const adapter_pg_1 = require("@prisma/adapter-pg");
const chatpay_middleware_1 = require("chatpay-middleware");
const queue_1 = require("../lib/queue");
const rateLimiter_1 = require("../lib/rateLimiter");
const ioredis_1 = __importDefault(require("ioredis"));
const zod_1 = __importDefault(require("zod"));
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new chatpay_db_1.PrismaClient({ adapter });
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
exports.offRampRouter = (0, express_2.Router)();
exports.offRampRouter.use(express_1.default.json());
const offRampInput = zod_1.default.object({
    amount: zod_1.default.number().positive(),
    accountNumber: zod_1.default.string().min(1),
    ifscCode: zod_1.default.string().min(1)
});
const offRampLimiter = (0, rateLimiter_1.rateLimitMiddleware)('offramp', 3, 60);
exports.offRampRouter.post("/offramp", chatpay_middleware_1.authMiddleware, offRampLimiter, async (req, res) => {
    const parsed = offRampInput.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });
    const { amount, accountNumber, ifscCode } = parsed.data;
    const userId = req.userId;
    const cacheKey = `profile:${userId}`;
    try {
        await prisma.$transaction(async (txn) => {
            await txn.$queryRaw `SELECT * FROM "Balance" WHERE "userId"=${userId} FOR UPDATE`;
            const balance = await txn.balance.findUnique({ where: { userId } });
            if (!balance) {
                res.status(404).json({ message: "Balance not found" });
                return;
            }
            const availableBalance = balance.amount - balance.locked;
            if (availableBalance < amount * 100)
                throw new Error('Insufficient Balance');
            await txn.balance.update({ where: { userId }, data: { locked: { increment: amount * 100 } } });
            await redis.del(cacheKey);
            const offRampTxn = await txn.offRampTransaction.create({ data: {
                    status: 'QUEUED',
                    amount: amount * 100,
                    userId,
                    accountNumber,
                    ifscCode,
                    startedAt: new Date()
                } });
            await queue_1.withdrawalQueue.add('offRampTxn', { offRampTxnId: offRampTxn.id }, {
                jobId: String(offRampTxn.id),
                removeOnComplete: true,
                removeOnFail: { age: 24 * 3600 },
                attempts: 5,
                backoff: { type: 'fixed', delay: 10000 }
            });
            res.json({ message: 'Withdrawal Request Queued', id: offRampTxn.id });
        });
    }
    catch (e) {
        return res.status(400).json({ message: e.message });
    }
});
//# sourceMappingURL=offRamp.js.map