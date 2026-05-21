"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const chatpay_db_1 = require("chatpay-db");
const adapter_pg_1 = require("@prisma/adapter-pg");
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET || '';
const app = (0, express_1.default)();
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new chatpay_db_1.PrismaClient({ adapter });
app.post('/webhook', express_1.default.raw({ type: 'application/json' }), async (request, response) => {
    let event = request.body;
    if (endpointSecret) {
        const signature = request.headers['stripe-signature'];
        try {
            event = stripe.webhooks.constructEvent(request.body, signature, endpointSecret);
        }
        catch (err) {
            console.error('Webhook signature verification failed.', err.message);
            return response.sendStatus(400);
        }
    }
    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const token = session.metadata?.token;
            const amount = session.amount_total;
            if (!token) {
                console.error('[webhook] No token in session metadata. metadata =', JSON.stringify(session.metadata));
                return response.json({ received: true });
            }
            const txn = await prisma.onRampTransaction.findUnique({ where: { token } });
            if (!txn) {
                console.error('[webhook] No onRampTransaction found for token', token);
                return response.json({ received: true });
            }
            if (txn.status === 'COMPLETED') {
                return response.json({ received: true });
            }
            await prisma.$transaction([
                prisma.balance.upsert({
                    where: { userId: txn.userId },
                    create: { userId: txn.userId, amount: amount, locked: 0 },
                    update: { amount: { increment: amount } }
                }),
                prisma.onRampTransaction.update({
                    where: { token },
                    data: { status: 'COMPLETED' }
                })
            ]);
            console.log('[webhook] Credited', amount, 'paise to user', txn.userId);
        }
    }
    catch (e) {
        console.error('[webhook] processing error', e?.message);
        return response.sendStatus(500);
    }
    return response.json({ received: true });
});
const PORT = process.env.PORT ? Number(process.env.PORT) : 4242;
app.listen(PORT, () => console.log(`Webhook listening on port ${PORT}`));
//# sourceMappingURL=index.js.map