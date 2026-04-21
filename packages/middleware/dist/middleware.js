"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "";
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default();
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
    try {
        const ifUser = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.userId = ifUser.userId;
        req.time = ifUser.time;
        req.exp = ifUser.exp;
        const checkCache = await redis.get(`blacklist:${ifUser.userId}`);
        if (checkCache) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        next();
    }
    catch {
        res.status(401).json({ message: "Unauthorized" });
    }
}
//# sourceMappingURL=middleware.js.map