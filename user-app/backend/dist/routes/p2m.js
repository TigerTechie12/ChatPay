"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.p2mRouter = void 0;
const express_1 = __importDefault(require("express"));
const express_2 = require("express");
const chatpay_db_1 = require("chatpay-db");
const adapter_pg_1 = require("@prisma/adapter-pg");
const chatpay_middleware_1 = require("chatpay-middleware");
const shreyash_chatpay_common_1 = require("shreyash-chatpay-common");
const rateLimiter_1 = require("../lib/rateLimiter");
const redis_1 = __importDefault(require("../lib/redis"));
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new chatpay_db_1.PrismaClient({ adapter });
exports.p2mRouter = (0, express_2.Router)();
exports.p2mRouter.use(express_1.default.json());
const transferLimiter = (0, rateLimiter_1.rateLimitMiddleware)('p2m', 10, 60);
exports.p2mRouter.get('/merchant/:merchantId', chatpay_middleware_1.authMiddleware, async (req, res) => {
    const merchantId = parseInt(req.params.merchantId);
    if (isNaN(merchantId))
        return res.status(400).json({ message: "Invalid merchantId" });
    try {
        const merchant = await prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { id: true, name: true, authType: true }
        });
        if (!merchant)
            return res.status(404).json({ message: "Merchant not found" });
        return res.json({ id: merchant.id, name: merchant.name, verified: true });
    }
    catch (e) {
        return res.status(500).json({ message: e.message });
    }
});
exports.p2mRouter.post('/transfer/merchant', chatpay_middleware_1.authMiddleware, transferLimiter, async (req, res) => {
    const parsed = shreyash_chatpay_common_1.merchantPaymentSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });
    const { amount, merchantId, label } = parsed.data;
    const userId = req.userId;
    const channel = `channel-${merchantId}`;
    try {
        const balance = await prisma.balance.findUnique({ where: { userId } });
        if (!balance)
            return res.status(404).json({ message: "Balance not found" });
        const availableBalance = balance.amount - balance.locked;
        if (availableBalance < amount * 100)
            return res.status(400).json({ message: "Insufficient balance" });
        await prisma.$transaction(async (txn) => {
            await txn.$queryRaw `SELECT * FROM "Balance" WHERE "userId"=${userId} FOR UPDATE`;
            await txn.balance.update({ where: { userId }, data: { amount: { decrement: amount * 100 } } });
            await txn.merchantBalance.update({ where: { merchantId }, data: { amount: { increment: amount * 100 } } });
            await txn.merchantPayment.create({ data: { amount: amount * 100, merchantId, userId, ...(label ? { label } : {}) } });
        });
        await redis_1.default.publish(channel, JSON.stringify({ message: `Payment of ₹${amount} received` }));
        return res.status(200).json({ message: "Payment Successful to the Merchant" });
    }
    catch (e) {
        return res.status(400).json({ message: e.message });
    }
});
//# sourceMappingURL=p2m.js.map