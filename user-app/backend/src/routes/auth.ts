import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {UserSchema} from '../../../packages/common/src/index'
import jwt from 'jsonwebtoken'
export const router=Router()
const prisma = new PrismaClient();


const JWT_SECRET=process.env.JWT_SECRET || ""

router.post('/signup',async(req,res)=>{
  const name=req.body.name
  const email=req.body.email
  const password=req.body.password
  const number=req.body.number
  try{
    const userExists=await prisma.user.findUnique({
        where:{email:email,
            number:number
        }
    })
    if(userExists){
     return   res.json({message:"User already exists"})
    }
    const userCreate=await prisma.user.create({
        data:{
            name:name,
            email:email,
            password:password,
            number:number
        }
    })

res.status(200).json({message:"User created"})
}
  catch(e){message:"Error creating user"}  
})
router.post('/signin',async(req,res)=>{
const email=req.body.email
const password=req.body.password
const name=req.body.name
try{ const user:any=await prisma.user.findUnique({
    id:{email:email,name:name}
})
if(!user){return res.json({message:"User not found"})}
const userId=user.id

const token=jwt.sign({name:name,password:password,email:email,userId},JWT_SECRET)
res.status(200).json({message:"User created",token:token})

}

catch(e){
    return res.json({message:"Error signing in user"})
}})
