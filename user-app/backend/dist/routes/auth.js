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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const redis_1 = __importDefault(require("../lib/redis"));
const chatpay_middleware_1 = require("chatpay-middleware");
const rateLimiter_1 = require("../lib/rateLimiter");
exports.router = (0, express_1.Router)();
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new chatpay_db_1.PrismaClient({ adapter });
const JWT_SECRET = process.env.JWT_SECRET || "";
const authRateLimiter = (0, rateLimiter_1.rateLimitMiddleware)('auth', 5, 60);
exports.router.post('/signup', authRateLimiter, async (req, res) => {
    const parsed = shreyash_chatpay_common_1.UserSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }
    const { name, email, password, number } = parsed.data;
    let numberBig;
    try {
        numberBig = BigInt(number);
    }
    catch {
        return res.status(400).json({ message: 'Invalid phone number' });
    }
    try {
        const userExists = await prisma.user.findFirst({ where: { OR: [{ email }, { number: numberBig }] } });
        if (userExists)
            return res.status(409).json({ message: 'User already exists' });
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        await prisma.user.create({ data: {
                name, email, password: hashedPassword, number: numberBig,
                Balance: { create: { amount: 0, locked: 0 } }
            } });
        res.status(201).json({ message: 'User created' });
    }
    catch (e) {
        console.error('[signup error]', e?.message, e?.code, e?.meta);
        res.status(500).json({ message: 'Error creating user', error: e?.message });
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
        const passwordMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!passwordMatch)
            return res.status(401).json({ message: 'Invalid credentials' });
        await redis_1.default.del(`blacklist:${user.id}`);
        const minutes = new Date().getMinutes();
        const token = jsonwebtoken_1.default.sign({ name: user.name, email, userId: user.id, time: minutes, jti: (0, crypto_1.randomUUID)(), exp: Math.floor(Date.now() / 1000) + 3600 }, JWT_SECRET);
        res.status(200).json({ message: 'Signed in', token });
    }
    catch (e) {
        res.status(500).json({ message: 'Error signing in' });
    }
});
exports.router.post('/signout', chatpay_middleware_1.authMiddleware, async (req, res) => {
    const remaining = Math.max(0, (req.exp ?? 0) - Math.floor(Date.now() / 1000));
    if (remaining > 0 && req.jti) {
        await redis_1.default.set(`blacklist:${req.jti}`, 'true', 'EX', remaining);
    }
    res.status(200).json({ message: 'Signed out' });
});
exports.router.get('/me', chatpay_middleware_1.authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true, name: true, email: true, number: true }
        });
        if (!user)
            return res.status(404).json({ message: 'User not found' });
        return res.json({ ...user, number: user.number?.toString() ?? null });
    }
    catch (e) {
        return res.status(500).json({ message: 'Error fetching profile' });
    }
});
exports.router.get('/users/search', chatpay_middleware_1.authMiddleware, async (req, res) => {
    const q = (req.query.q ?? '').trim();
    if (q.length < 2)
        return res.json({ users: [] });
    try {
        const isNumber = /^\d+$/.test(q);
        const users = await prisma.user.findMany({
            where: {
                AND: [
                    { id: { not: req.userId } },
                    isNumber
                        ? { number: BigInt(q) }
                        : { name: { contains: q, mode: 'insensitive' } }
                ]
            },
            select: { id: true, name: true, number: true },
            take: 10
        });
        return res.json({ users: users.map(u => ({ ...u, number: u.number?.toString() ?? null })) });
    }
    catch (e) {
        return res.status(500).json({ message: 'Error searching users' });
    }
});
//# sourceMappingURL=auth.js.map