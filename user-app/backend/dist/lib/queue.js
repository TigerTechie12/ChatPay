"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdrawalQueue = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const connection = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
connection.on('error', (err) => console.error('[queue-redis]', err.message));
exports.withdrawalQueue = new bullmq_1.Queue('withdrawalQueue', { connection });
exports.withdrawalQueue.on('error', (err) => console.error('[queue]', err.message));
//# sourceMappingURL=queue.js.map