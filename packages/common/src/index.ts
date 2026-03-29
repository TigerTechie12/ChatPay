import zod from "zod";

export const UserSchema=zod.object({
    name:zod.string(),
    email:zod.email(),
    password:zod.string(),
    number:zod.string()
})

export const OnRampSchema=zod.object({
    amount:zod.number(),
    provider:zod.enum(["STRIPE"])
})