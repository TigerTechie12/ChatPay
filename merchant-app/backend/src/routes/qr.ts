import express from 'express'
import { Router } from 'express'
import { PrismaClient } from 'chatpay-db'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})
import { authMiddleware } from 'chatpay-middleware'
import { generateQRSchema } from 'shreyash-chatpay-common'
import qrCode from 'qrcode'

export const qrRouter=Router()
const qrInput = generateQRSchema.pick({amount: true, label: true})
qrRouter.use(express.json())
qrRouter.use(authMiddleware)

qrRouter.post('/qr/generate',async(req:any,res:any)=>{
    const parsed = qrInput.safeParse(req.body)
    if(!parsed.success) return res.status(400).json({message: parsed.error.issues[0]?.message ?? 'Invalid input'})
    const {amount,label}=parsed.data
    const merchantId=req.userId
    if(!merchantId) return res.status(400).json({message:"Invalid merchant ID"})
    const amountInPaise=Number(amount)
const qrString=`chatpay://pay?merchantId=${merchantId}&amount=${amountInPaise}&label=${encodeURIComponent(label || '')}`
try{const QrCode=await prisma.qRCode.create({
    data:{
        merchantId,
        amount:amountInPaise,
    label:label || null,
code:qrString}

})
const dataURL=await qrCode.toDataURL(qrString)
return res.status(200).json({dataURL})
}

catch(e:any){return res.status(400).json({message:e.message})
}})

qrRouter.get('/qr/list',async(req:any,res:any)=>{
const qrList=await prisma.qRCode.findMany({where:{merchantId:req.userId},select:{id:true,code:true,amount:true,label:true,createdAt:true}})
  const formattedQrList=qrList.map((qr:any)=>({id:qr.id,amount:qr.amount,label:qr.label,code:qr.code}))
return res.status(200).json({message:"QR codes fetched successfully",qrList:formattedQrList})
})
