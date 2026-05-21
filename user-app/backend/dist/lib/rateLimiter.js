"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitMiddleware = rateLimitMiddleware;
const redis_1 = __importDefault(require("./redis"));
function rateLimitMiddleware(prefix, limit, windowSec) {
    return async (req, res, next) => {
        const key = `rl:${prefix}:${req.userId ?? req.ip ?? 'unknown'}`;
        const now = Date.now();
        const pipeline = redis_1.default.pipeline();
        pipeline.zremrangebyscore(key, 0, now - windowSec * 1000);
        pipeline.zcard(key);
        pipeline.zadd(key, now, `${now}-${Math.random()}`);
        pipeline.expire(key, windowSec);
        try {
            const results = await pipeline.exec();
            const count = results[1]?.[1] ?? 0;
            if (count >= limit) {
                res.status(429).json({ message: 'Too many requests', retryAfter: windowSec });
                return;
            }
        }
        catch {
        }
        next();
    };
}
//# sourceMappingURL=rateLimiter.js.map