import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
const authRouter=Router()
const prisma=new PrismaClient()
import jwt from 'jsonwebtoken'

authRouter.post('/api/auth/google',async(req,res)=>{
    const {code}=req.body

   try{

 const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: 'http://localhost:3006/auth/callback',
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
    email:email,
    authType:'GOOGLE'
}})

const token=jwt.sign({email:email,name:name,userId:newMerchant.id,time:Date.now(),exp:Math.floor(Date.now()/1000)+(60*60)},process.env.JWT_SECRET!)
res.status(200).json({token:token,merchantId:newMerchant.id,name:name,email:email})

}
   catch(error){
    console.error('Error during Google authentication:', error)
   return res.status(500).json({ error: 'Internal server error' })
   }

})
