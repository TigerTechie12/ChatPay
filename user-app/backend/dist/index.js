"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const auth_1 = require("./routes/auth");
const onRamp_1 = require("./routes/onRamp");
const offRamp_1 = require("./routes/offRamp");
const p2m_1 = require("./routes/p2m");
const p2pW_1 = require("./routes/p2pW");
const port = 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/v1", auth_1.router);
app.use("/api/v1", onRamp_1.userRouter);
app.use("/api/v1", offRamp_1.offRampRouter);
app.use("/api/v1", p2m_1.p2mRouter);
app.use("/api/v1", p2pW_1.walletPayRouter);
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
//# sourceMappingURL=index.js.map