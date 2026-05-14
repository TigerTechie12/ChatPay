import zod from "zod";
export declare const UserSchema: zod.ZodObject<{
    name: zod.ZodString;
    email: zod.ZodEmail;
    password: zod.ZodString;
    number: zod.ZodString;
}, zod.core.$strip>;
export declare const OnRampSchema: zod.ZodObject<{
    amount: zod.ZodNumber;
    provider: zod.ZodEnum<{
        STRIPE: "STRIPE";
    }>;
}, zod.core.$strip>;
export declare const OffRampSchema: zod.ZodObject<{}, zod.core.$strip>;
export declare const p2pWSchema: zod.ZodObject<{
    phoneNumber: zod.ZodNumber;
    amount: zod.ZodNumber;
}, zod.core.$strip>;
export declare const p2pBSchema: zod.ZodObject<{
    amount: zod.ZodNumber;
    provider: zod.ZodString;
    accountNumber: zod.ZodNumber;
    ifscCode: zod.ZodString;
}, zod.core.$strip>;
export declare const conversationParticipantSchema: zod.ZodObject<{
    userId: zod.ZodNumber;
    publicKey: zod.ZodString;
}, zod.core.$strip>;
export declare const authMerchantSchema: zod.ZodObject<{
    code: zod.ZodString;
}, zod.core.$strip>;
export declare const generateQRSchema: zod.ZodObject<{
    amount: zod.ZodNumber;
    label: zod.ZodOptional<zod.ZodString>;
    merchantId: zod.ZodNumber;
}, zod.core.$strip>;
export declare const merchantPaymentSchema: zod.ZodObject<{
    amount: zod.ZodNumber;
    merchantId: zod.ZodNumber;
    label: zod.ZodOptional<zod.ZodString>;
}, zod.core.$strip>;
//# sourceMappingURL=index.d.ts.map