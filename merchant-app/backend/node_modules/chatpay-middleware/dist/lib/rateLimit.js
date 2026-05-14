"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = rateLimit;
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default();
async function rateLimit(key, limit, windowinSec) {
    const now = Date.now();
    const windowStart = now - windowinSec * 1000;
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);
    pipeline.zadd(key, Math.random().toString());
    pipeline.expire(key, windowinSec);
    const results = await pipeline.exec();
    const count = results[1][1] || 0;
    if (count >= limit) {
        return { allowed: false, remaining: 0, retryAfter: windowinSec };
    }
    return { allowed: true, remaining: limit - count - 1 };
}
//# sourceMappingURL=rateLimit.js.map