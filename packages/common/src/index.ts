import zod from "zod";

export const UserSchema=zod.object({
    name:zod.string(),
    email:zod.email(),
    password:zod.string(),
    number:zod.string()
})

export const OnRampSchema=zod.object({
    amount:zod.number().positive(),
    provider:zod.enum(["STRIPE"])
})

export const OffRampSchema=zod.object({})

export const p2pWSchema=zod.object({
    phoneNumber:zod.number().max(10),
    amount:zod.number().positive()
})
export const p2pBSchema=zod.object({
amount:zod.number().positive(),
 provider:zod.string(),
 accountNumber:zod.number().positive(),
ifscCode:zod.string()

})
export const conversationParticipantSchema=zod.object({
    userId:zod.number(),
    publicKey:zod.string()
})

export const authMerchantSchema=zod.object({
    code:zod.string()
})

export const generateQRSchema=zod.object({
    amount:zod.number().positive(),
    label:zod.string().optional(),
merchantId:zod.number()
})

export const merchantPaymentSchema=zod.object({
    amount:zod.number().positive(),
    merchantId:zod.number(),
    label:zod.string().optional()
})