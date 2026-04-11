import express from 'express'
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../../../packages/middleware/src/middleware';
import qrCode from 'qrcode'
const qrRouter=Router()
const prisma=new PrismaClient()
qrRouter.use(express.json())
qrRouter.use(authMiddleware)

qrRouter.post('/api/qr/generate',async(req,res)=>{
    const {amount,label}=req.body
    const merchantId=req.userId
    const amountInPaise=amount*100
const qrString=JSON.stringify(`chatpay://pay?merchantId=${merchantId}&amount=${amountInPaise}&label=${label || ''}`)
try{const QrCode=await prisma.QRcode.create({
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

qrRouter.get('/api/qr/list',async(req,res)=>{
const qrList=await prisma.QRcode.findMany({where:{merchantId:req.userId},select:{id:true,code:true,amount:true,label:true,createdAt:true}})
  const formattedQrList=qrList.data.map((qr:any)=>{
    qr.id,qr.amount,qr.label,qr.code
  })  
return res.status(200).json({message:"QR codes fetched successfully",qrList:formattedQrList})
})
