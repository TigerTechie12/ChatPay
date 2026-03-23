import zod from "zod";

export const UserSchema=zod.object({
    name:zod.string(),
    email:zod.email(),
    password:zod.string(),
    number:zod.string()
})