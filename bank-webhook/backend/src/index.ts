import express from 'express'
// This is your test secret API key.
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || '');
// Replace this endpoint secret with your endpoint's unique secret
// If you are testing with the CLI, find the secret by running 'stripe listen'
// If you are using an endpoint defined with the API or dashboard, look in your webhook settings
// at https://dashboard.stripe.com/webhooks
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET || '';

const app = express();

app.post('/webhook', express.raw({type: 'application/json'}), (request, response) => {
  {let event = request.body;
  // Only verify the event if you have an endpoint secret defined.
  // Otherwise use the basic event deserialized with JSON.parse
  if (endpointSecret) {
    // Get the signature sent by Stripe
    const signature = request.headers['stripe-signature'];
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        endpointSecret
      );
   
    
    
    } catch (err:any) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return response.sendStatus(400);
    }

  }
 if(event.type==="checkout.session.completed"){
        const session=event.data.object
const token=event.metadata?.token

    }

    
}})

  app.listen(4242, () => console.log('Running on port 4242'));