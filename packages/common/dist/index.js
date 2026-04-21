"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.merchantPaymentSchema = exports.generateQRSchema = exports.authMerchantSchema = exports.conversationParticipantSchema = exports.p2pBSchema = exports.p2pWSchema = exports.OffRampSchema = exports.OnRampSchema = exports.UserSchema = void 0;
const zod_1 = __importDefault(require("zod"));
exports.UserSchema = zod_1.default.object({
    name: zod_1.default.string(),
    email: zod_1.default.email(),
    password: zod_1.default.string(),
    number: zod_1.default.string()
});
exports.OnRampSchema = zod_1.default.object({
    amount: zod_1.default.number().positive(),
    provider: zod_1.default.enum(["STRIPE"])
});
exports.OffRampSchema = zod_1.default.object({});
exports.p2pWSchema = zod_1.default.object({
    phoneNumber: zod_1.default.number().max(10),
    amount: zod_1.default.number().positive()
});
exports.p2pBSchema = zod_1.default.object({
    amount: zod_1.default.number().positive(),
    provider: zod_1.default.string(),
    accountNumber: zod_1.default.number().positive(),
    ifscCode: zod_1.default.string()
});
exports.conversationParticipantSchema = zod_1.default.object({
    userId: zod_1.default.number(),
    publicKey: zod_1.default.string()
});
exports.authMerchantSchema = zod_1.default.object({
    code: zod_1.default.string()
});
exports.generateQRSchema = zod_1.default.object({
    amount: zod_1.default.number().positive(),
    label: zod_1.default.string().optional(),
    merchantId: zod_1.default.number()
});
exports.merchantPaymentSchema = zod_1.default.object({
    amount: zod_1.default.number().positive(),
    merchantId: zod_1.default.number(),
    label: zod_1.default.string().optional()
});
//# sourceMappingURL=index.js.map