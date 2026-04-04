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