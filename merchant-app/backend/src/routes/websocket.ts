import express from 'express'
import http from 'http'
import {WebSocketServer} from 'ws'
import jwt from 'jsonwebtoken'
import url from 'url'
import IOredis from 'ioredis'
const JWT_SECRET=process.env.JWT_SECRET as string
const wss=new WebSocketServer({noServer:true})

const app=express()
const server=http.createServer(app)
server.on('upgrade',(req,socket,head)=>{
const {query}=url.parse(req.url as string,true)
const token=query.token as string
if(!token){
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return
}
try{
const decoded=jwt.verify(token,JWT_SECRET) as jwt.JwtPayload

;(req as any).merchantId=decoded.merchantId

wss.handleUpgrade(req,socket as any,head as any,(socket)=>{
wss.emit('connection',socket,req)
})}
  catch(e){
console.error('Invalid token during WebSocket upgrade')
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
return
  }

})


wss.on('connection',(socket,req:any)=>{
socket.on('error',(error:any)=>{console.log('Webosocket error:',error)})
const merchantId=req.merchantId
const channel=`channel-${merchantId}`
const subscriber=new IOredis()

subscriber.subscribe(channel, (err, count) => {
  if (err) {
    console.error("Failed to subscribe: %s", err.message);
  } else {
    console.log(`Subscribed successfully! This client is currently subscribed to ${count} channels.`)
  }
})

subscriber.on("message", (ch, message) => {
  if(ch===channel){
    socket.send(message)
  }
})

socket.on('close',()=>{
  subscriber.unsubscribe(channel)
  subscriber.quit()
})



})
const PORT = process.env.PORT || 8080
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})

