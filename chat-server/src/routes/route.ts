import express from 'express'
import { Router } from "express";
import { authMiddleware } from "../../../../packages/middleware/src/middleware";
import { PrismaClient } from '@prisma/client';
const prisma=new PrismaClient()
export const chatRouter=Router()

chatRouter.get('/api/conversations',async(req,res,authMiddleware)=>{
const userId=req.userId
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

)