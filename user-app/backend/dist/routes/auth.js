"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const chatpay_db_1 = require("chatpay-db");
const adapter_pg_1 = require("@prisma/adapter-pg");
const shreyash_chatpay_common_1 = require("shreyash-chatpay-common");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ioredis_1 = __importDefault(require("ioredis"));
const chatpay_middleware_1 = require("chatpay-middleware");
const rateLimiter_1 = require("../lib/rateLimiter");
exports.router = (0, express_1.Router)();
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new chatpay_db_1.PrismaClient({ adapter });
const JWT_SECRET = process.env.JWT_SECRET || "";
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const authRateLimiter = (0, rateLimiter_1.rateLimitMiddleware)('auth', 5, 60);
exports.router.post('/signup', authRateLimiter, async (req, res) => {
    const parsed = shreyash_chatpay_common_1.UserSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }
    const { name, email, password, number } = parsed.data;
    const numberInt = parseInt(number, 10);
    if (isNaN(numberInt))
        return res.status(400).json({ message: 'Invalid phone number' });
    try {
        const userExists = await prisma.user.findFirst({ where: { OR: [{ email }, { number: numberInt }] } });
        if (userExists)
            return res.status(409).json({ message: 'User already exists' });
        await prisma.user.create({ data: { name, email, password, number: numberInt } });
        res.status(201).json({ message: 'User created' });
    }
    catch (e) {
        res.status(500).json({ message: 'Error creating user' });
    }
});
exports.router.post('/signin', authRateLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ message: 'Email and password required' });
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        if (user.password !== password)
            return res.status(401).json({ message: 'Invalid credentials' });
        const minutes = new Date().getMinutes();
        const token = jsonwebtoken_1.default.sign({ name: user.name, email, userId: user.id, time: minutes, exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
        res.status(200).json({ message: 'Signed in', token });
    }
    catch (e) {
        res.status(500).json({ message: 'Error signing in' });
    }
});
exports.router.post('/signout', chatpay_middleware_1.authMiddleware, async (req, res) => {
    const remaining = Math.max(0, (req.exp ?? 0) - Math.floor(Date.now() / 1000));
    if (remaining > 0) {
        await redis.set(`blacklist:${req.userId}`, 'true', 'EX', remaining);
    }
    res.status(200).json({ message: 'Signed out' });
});
//# sourceMappingURL=auth.js.map