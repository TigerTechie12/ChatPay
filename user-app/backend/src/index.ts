import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { PrismaClient } from '@prisma/client';
const app=express()
const prisma = new PrismaClient();

app.use(cors());
app.use(bodyParser.json());
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
  }
  catch(e){}  
})