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
try{const decode=jwt.verify(token,JWT_SECRET)
    const userId=decode.userId 
wss.handleUpgrade(req,socket as any,head as any,(socket)=>{
    activeConnections.set(userId, socket)
wss.emit('connection',socket,req)
})}
 catch(e){ socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return}

})

