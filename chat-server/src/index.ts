import WebSocket,{WebSocketServer} from 'ws'
import {prismaClient} from '@chatpay/prisma-client'
import http from 'http'
const prisma=prismaClient()
import express from 'express'
const app=express()
const wss=new WebSocketServer({noServer:true})
const server=http.createServer(app)
import url from 'url'
server.on('upgrade',(req,socket,head)=>{
const {query}=url.parse(req.url as string,true)
const token=query.token 
if(!token){
     socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return
}


})