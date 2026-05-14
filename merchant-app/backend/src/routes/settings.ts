import express from "express"
import { Router } from "express"
import { PrismaClient } from 'chatpay-db'
import { PrismaPg } from '@prisma/adapter-pg'
import { authMiddleware } from "chatpay-middleware"
import { z } from 'zod'

export const settingsRouter=Router()
const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})
settingsRouter.use(express.json())
settingsRouter.use(authMiddleware)

const bankDetailsSchema = z.object({
  bankAccountNumber: z.string().min(1),
  bankIfscCode: z.string().min(1),
  bankAccountName: z.string().optional()
})

settingsRouter.get('/merchant/settings',async(req:any,res:any)=>{
  const merchant=await prisma.merchant.findUnique({
    where:{id:req.userId},
    select:{name:true,email:true,bankAccountNumber:true,bankIfscCode:true,bankAccountName:true}
  })
  if(!merchant) return res.status(404).json({message:"Merchant not found"})
  return res.status(200).json({merchant})
})

settingsRouter.put('/merchant/updateBankDetails',async(req:any,res:any)=>{
  const parsed = bankDetailsSchema.safeParse(req.body)
  if(!parsed.success) return res.status(400).json({message: parsed.error.issues[0]?.message ?? 'Invalid input'})
  const {bankAccountNumber,bankIfscCode,bankAccountName}=parsed.data
  try{
    const updated=await prisma.merchant.update({
      where:{id:req.userId},
      data:{
        bankAccountNumber,
        bankIfscCode:bankIfscCode.toUpperCase(),
        bankAccountName:bankAccountName||null
      },
      select:{bankAccountNumber:true,bankIfscCode:true,bankAccountName:true}
    })
    return res.status(200).json({message:"Bank details updated",merchant:updated})
  }catch(e:any){
    return res.status(400).json({message:e.message})
  }
})
