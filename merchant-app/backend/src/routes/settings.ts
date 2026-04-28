import express from "express"
import { Router } from "express"
import { PrismaClient } from "@prisma/client"
import { authMiddleware } from "../../../../packages/middleware/src/middleware"
const settingsRouter=Router()
const prisma=new PrismaClient()
settingsRouter.use(express.json())
settingsRouter.use(authMiddleware)

settingsRouter.get('/api/merchant/settings',async(req,res)=>{
  const merchant=await prisma.merchant.findUnique({
    where:{id:req.userId},
    select:{name:true,email:true,bankAccountNumber:true,bankIfscCode:true,bankAccountName:true}
  })
  if(!merchant) return res.status(404).json({message:"Merchant not found"})
  return res.status(200).json({merchant})
})

settingsRouter.put('/api/merchant/updateBankDetails',async(req,res)=>{
  const {bankAccountNumber,bankIfscCode,bankAccountName}=req.body
  if(!bankAccountNumber||!bankIfscCode) return res.status(400).json({message:"Account number and IFSC are required"})
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
