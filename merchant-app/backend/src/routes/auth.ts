import { Router } from 'express'
import { PrismaClient } from 'chatpay-db'
import { PrismaPg } from '@prisma/adapter-pg'
import jwt from 'jsonwebtoken'
import { authMerchantSchema } from 'shreyash-chatpay-common'

export const authRouter=Router()
const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})

authRouter.post('/auth/google',async(req,res)=>{
    const parsed = authMerchantSchema.safeParse(req.body)
    if(!parsed.success) return res.status(400).json({message: parsed.error.issues[0]?.message ?? 'Invalid input'})
    const {code}=parsed.data

   try{

 const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code,
      client_id: (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000',
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenResponse.json()
 const payload = JSON.parse(
    Buffer.from(tokens.id_token.split('.')[1], 'base64').toString()
  )
const {email,name}=payload

const checkMerchant=await prisma.merchant.findUnique({
    where:{email:email}
})
if(checkMerchant){
const token=jwt.sign({email:email,name:name,userId:checkMerchant.id,time:Date.now(), exp: Math.floor(Date.now() / 1000) + (60 * 60)},process.env.JWT_SECRET!)
return res.json({token:token})
}
const newMerchant=await prisma.merchant.create({data:{
    name:name,
    authType:"Google",
    email:email}})

const token=jwt.sign({email:email,name:name,userId:newMerchant.id,time:Date.now(),exp:Math.floor(Date.now()/1000)+(60*60)},process.env.JWT_SECRET!)
res.status(200).json({token:token,merchantId:newMerchant.id,name:name,email:email})

}
   catch(error){
    console.error('Error during Google authentication:', error)
   return res.status(500).json({ error: 'Internal server error' })
   }

})
