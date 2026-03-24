import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { PrismaClient } from '@prisma/client';
import {UserSchema} from '../../../packages/common/src/index'
import jwt from 'jsonwebtoken'
const app=express()
const prisma = new PrismaClient();

app.use(cors());
app.use(bodyParser.json());
const JWT_SECRET=process.env.JWT_SECRET || ""


app.post('/signup',async(req,res)=>{
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
const token=jwt.sign({name:name,password:password,email:email},JWT_SECRET)
res.status(200).json({message:"User created",token:token})
}
  catch(e){message:"Error creating user"}  
})
app.post('/signin',async(req,res)=>{
const email=req.body.email
const password=req.body.password
const name=req.body.name
try{ const user=await prisma.user.findUnique({
    id:{email:email,name:name}
})
if(!user){return res.json({message:"User not found"})}

const token=jwt.sign({name:name,password:password,email:email},JWT_SECRET)
res.status(200).json({message:"User created",token:token})

}

catch(e){
    return res.json({message:"Error signing in user"})
}})
