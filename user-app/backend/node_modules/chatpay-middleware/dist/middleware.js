"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "";
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
redis.on('error', (err) => console.error('[middleware-redis]', err.message));
async function authMiddleware(req, res, next) {
    const headers = req.headers.authorization;
    if (!headers || !headers.startsWith("Bearer")) {
        res.json({ message: "Unauthorized" });
        return;
    }
    const token = headers.split(' ')[1];
    if (!token) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    let ifUser;
    try {
        ifUser = jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    req.userId = ifUser.userId;
    req.time = ifUser.time;
    req.exp = ifUser.exp;
    try {
        const checkCache = await redis.get(`blacklist:${ifUser.userId}`);
        if (checkCache) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
    }
    catch {
    }
    next();
}
//# sourceMappingURL=middleware.js.map