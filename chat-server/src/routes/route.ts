import express from 'express'
import { Router } from "express";
import { authMiddleware } from "../../../../packages/middleware/src/middleware";
import { PrismaClient } from '@prisma/client';
const prisma=new PrismaClient()
export const chatRouter=Router()
chatRouter.use(express.json())
chatRouter.use(authMiddleware)
chatRouter.get('/api/conversations',async(req,res)=>{
const userId=req.userId
try{
const conversationParticipant=await prisma.conversationParticipant.findMany({where:{userId:userId},
    include:{conversation:true,
    conversationId:true
}})
const conversationId=conversationParticipant.data.conversationId
const conversationTime=conversationParticipant.data.conversation.map((c:any)=>{c.createdAt=c.createdAt.toISOString();return c})
if(conversationParticipant.length===0){
    return res.status(401).json({message:"Yet to start any conversation"})
}

return res.status(200).json({message:'Conversations fetched successfully',conversationId:conversationId,conversationTime:conversationTime})
}
catch(e:any){return res.status(400).json({message:e.message})}

})

chatRouter.post('/api/conversations',async(req,res)=>{
const otherUserId=req.body.otherUserId
try{
const dbRecordCheck=await prisma.conversationParticpant.findUnique({where:{otherUserId_userId:{otherUserId:otherUserId}}})
if(dbRecordCheck){return res.status(200).json({message:"Conversation already exists",conversationId:dbRecordCheck.conversationId})}
const senderConversationParticipant=await prisma.conversationParticpant.create({data:{
    userId:req.userId,
    publickey:req.body.publicKey,

}})
}
catch(e:any){return res.status(400).json({message:e.message})}


})
chatRouter.get('/api/messages/:conversationId',async(req,res)=>{
    try{
const checkUser=await prisma.conversationParticipant.findUnique({where:{conversationId:req.params.conversationId,userId:req.userId}})
if(!checkUser){return res.status(401).json({message:"Unauthorized"})}
const conversationId=req.params.conversationId
const messageQuery=await prisma.message.findMany({where:{conversationId:conversationId}})
const messages=messageQuery.data.map((m:any)=>{m.id,m.senderId,m.ciphertext,m.createdAt,m.nonce})
return res.status(200).json({message:"Messages fetched successfully",messages:messages})

    }
    catch(e:any){return res.status(400).json({message:e.message})}
})
chatRouter.get('/api/users/:userId/publickey',async(req,res)=>{
const userId=req.params.userId
try{
    const checkUser=await prisma.user.findUnique({where:{id:userId}})
    if(!checkUser){return res.status(404).json({message:"User not found"})}
const publicKeyQuery=await prisma.conversationParticipant.findUnique({where:{userId:userId}})
if(!publicKeyQuery){return res.status(404).json({message:"Public key not found for the user"})}
const publicKey=publicKeyQuery.data.publickey
return res.status(200).json({message:"Public key fetched successfully",userId:userId,publicKey:publicKey})
}
catch(e:any){res.status(400).json({message:e.message})}
})

