"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletPayRouter = void 0;
const express_1 = require("express");
const chatpay_db_1 = require("chatpay-db");
const adapter_pg_1 = require("@prisma/adapter-pg");
const chatpay_middleware_1 = require("chatpay-middleware");
const shreyash_chatpay_common_1 = require("shreyash-chatpay-common");
const rateLimiter_1 = require("../lib/rateLimiter");
const redis_1 = __importDefault(require("../lib/redis"));
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new chatpay_db_1.PrismaClient({ adapter });
exports.walletPayRouter = (0, express_1.Router)();
const walletLimiter = (0, rateLimiter_1.rateLimitMiddleware)('p2p-wallet', 10, 60);
exports.walletPayRouter.post('/payAtWallet', chatpay_middleware_1.authMiddleware, walletLimiter, async (req, res) => {
    const parsed = shreyash_chatpay_common_1.p2pWSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });
    const { phoneNumber, amount } = parsed.data;
    const userId = req.userId;
    const amountInPaise = amount * 100;
    try {
        const userBalance = await prisma.balance.findUnique({ where: { userId } });
        if (!userBalance)
            return res.status(404).json({ message: "Balance not found" });
        const availableBalance = userBalance.amount - userBalance.locked;
        if (amountInPaise > availableBalance)
            return res.status(400).json({ message: "Insufficient Balance" });
        const recipient = await prisma.user.findUnique({ where: { number: phoneNumber } });
        if (!recipient)
            return res.status(404).json({ message: "Recipient not found with given phone number" });
        await prisma.$transaction(async (txn) => {
            await txn.$queryRaw `SELECT * FROM "Balance" WHERE "userId"=${userId} FOR UPDATE`;
            await txn.balance.update({ where: { userId }, data: { amount: { decrement: amountInPaise } } });
            await txn.balance.update({ where: { userId: recipient.id }, data: { amount: { increment: amountInPaise } } });
            await txn.p2pTransfer.create({ data: {
                    senderId: userId,
                    receiverId: recipient.id,
                    amount: amountInPaise,
                    timestamp: new Date()
                } });
        });
        await redis_1.default.del(`profile:${userId}`);
        return res.status(200).json({ message: "Payment Successful" });
    }
    catch (e) {
        return res.status(400).json({ message: e.message });
    }
});
//# sourceMappingURL=p2pW.js.map