import WebSocket,{WebSocketServer} from 'ws'
import {prismaClient} from '@chatpay/prisma-client'
import http from 'http'
const prisma=prismaClient()
import express from 'express'
const app=express()
const wss=new WebSocketServer({noServer:true})
const server=http.createServer(app)
import url from 'url'
import jwt from 'jsonwebtoken'
const JWT_SECRET=process.env.JWT_SECRET as string
const activeConnections=new Map()
server.on('upgrade',(req,socket,head)=>{
const {query}=url.parse(req.url as string,true)
const token=query.token as string
if(!token){
     socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return
}
try{const decode=jwt.verify(token,JWT_SECRET) as jwt.JwtPayload
    const userId=decode.userId 
wss.handleUpgrade(req,socket as any,head as any,(socket)=>{
    ;(socket as any).userId=userId
    activeConnections.set(userId, socket)
    socket.on('close',()=>{activeConnections.delete(userId)})
wss.emit('connection',socket,req)
})}
 catch(e){ socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return}

})

wss.on('connection',(socket,req)=>{
const userId=(socket as any).userId
socket.on('message',async(rawMessage:any)=>{
    const data=JSON.parse(rawMessage)
const checkConversationParticipant=await prisma.conversationParticipant.findUnique(
    {where:{conversationId:data.conversationId,userId:data.userId},
include:{user:true}})
if(!checkConversationParticipant){return}
const saveData=await prisma.message.create({data:{
conversationId:data.conversationId,
senderId:data.senderId,
ciphertext:data.ciphertext,
nonce:data.nonce,
createdAt:Date.now()
}})
for(let i=0; i<checkConversationParticipant.user.length; i++){

if(checkConversationParticipant.user[i].id !==data.senderId ){
 const receiverId=checkConversationParticipant.user[i]

    const activeMembersSocket=activeConnections.get(receiverId)
activeMembersSocket.send(JSON.stringify(saveData))
if(data.type ==='TYPING'){
const pushPayload={
    type:"USER_TYPING",
    conversationId:data.conversationId,
    typerId:userId
}
activeMembersSocket.send(JSON.stringify(pushPayload))
}

}
}
})
socket.on("close",()=>{
    activeConnections.delete(userId) 
})

})


