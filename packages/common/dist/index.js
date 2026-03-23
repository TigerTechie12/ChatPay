"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSchema = void 0;
const zod_1 = require("zod");
exports.UserSchema = zod_1.default.object({
    name: zod_1.default.string(),
    email: zod_1.default.email(),
    password: zod_1.default.string(),
    number: zod_1.default.string()
});
//# sourceMappingURL=index.js.map