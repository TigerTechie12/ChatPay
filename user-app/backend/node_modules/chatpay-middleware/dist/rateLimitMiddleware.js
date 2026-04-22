"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = rateLimiter;
const rateLimit_1 = require("./lib/rateLimit");
async function rateLimiter(prefix, limit, windowinSec) {
    return async function (req, res, next) {
        const key = `${prefix}:${req.userId || req.ip} `;
        const result = await (0, rateLimit_1.rateLimit)(key, limit, windowinSec);
        if (!result.allowed) {
            return res.status(429).json({ message: "Too Many Requests", retryAfter: result.retryAfter });
        }
        res.set('X-RateLimit-Limit', String(result.remaining));
        next();
    };
}
//# sourceMappingURL=rateLimitMiddleware.js.map