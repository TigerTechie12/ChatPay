import express from 'express'
import { PrismaClient } from 'chatpay-db'
import { PrismaPg } from '@prisma/adapter-pg'
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '')
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET || ''

const app = express()
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

app.post('/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
  let event = request.body
  if (endpointSecret) {
    const signature = request.headers['stripe-signature']
    try {
      event = stripe.webhooks.constructEvent(request.body, signature, endpointSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed.', err.message)
      return response.sendStatus(400)
    }
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const token = session.metadata?.token
      const amount = session.amount_total

      if (!token) {
        console.error('[webhook] No token in session metadata. metadata =', JSON.stringify(session.metadata))
        return response.json({ received: true })
      }

      const txn = await prisma.onRampTransaction.findFirst({ where: { token } })
      if (!txn) {
        console.error('[webhook] No onRampTransaction found for token', token)
        return response.json({ received: true })
      }
      if (txn.status === 'COMPLETED') {
        return response.json({ received: true })
      }

      await prisma.$transaction([
        prisma.balance.upsert({
          where: { userId: txn.userId },
          create: { userId: txn.userId, amount: amount, locked: 0 },
          update: { amount: { increment: amount } }
        }),
        prisma.onRampTransaction.update({
          where: { id: txn.id },
          data: { status: 'COMPLETED' }
        })
      ])
      console.log('[webhook] Credited', amount, 'paise to user', txn.userId)
    }
  } catch (e: any) {
    console.error('[webhook] processing error | message:', e?.message, '| code:', e?.code, '| meta:', JSON.stringify(e?.meta))
    return response.sendStatus(500)
  }

  return response.json({ received: true })
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 4242
app.listen(PORT, () => console.log(`Webhook listening on port ${PORT}`))
