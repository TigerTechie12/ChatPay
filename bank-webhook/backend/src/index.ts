import express from 'express'
import { PrismaClient } from 'chatpay-db'
import { PrismaPg } from '@prisma/adapter-pg'
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '')
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET || ''

const app = express()
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

app.post('/webhook', express.raw({type: 'application/json'}), async(request, response) => {
  {let event = request.body
  if (endpointSecret) {
    const signature = request.headers['stripe-signature']
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        endpointSecret
      )
} catch (err:any) {
      console.log(` Webhook signature verification failed.`, err.message)
      return response.sendStatus(400)
    }

  }
 if(event.type==="checkout.session.completed"){
        const session=event.data.object
const token=session.metadata?.token
const amount=session.amount_total
const id=await prisma.onRampTransaction.findUnique({where:{token:token}})
    const [balanceUpdate,onRampTransaction]=await prisma.$transaction([
        prisma.balance.update({
 where:{userId:id.userId},
 data:{amount:{increment:amount}}
        }),
prisma.onRampTransaction.update({where:{token:token},
data:{status:'COMPLETED'}})

    ])


    }


}})

app.listen(4242, () => console.log('Running on port 4242'))
