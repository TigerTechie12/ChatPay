import zod from "zod";
export declare const UserSchema: zod.ZodObject<{
    name: zod.ZodString;
    email: zod.ZodEmail;
    password: zod.ZodString;
    number: zod.ZodString;
}, zod.core.$strip>;
//# sourceMappingURL=index.d.ts.map