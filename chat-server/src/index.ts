import WebSocket,{WebSocketServer} from 'ws'

const wss=new WebSocket('')
interface User{
    socket:WebSocket,
    room:string
}
let allSockets:User[]=[]
wss.on('connection',(socket)=>{
    socket.on('error',(err:any)=>{
        console.error('WebSocket error:', err);
    })

socket.on('message',(message:any)=>{
    const parsedMessage=JSON.parse(message)
    if(parsedMessage.type==='join'){allSockets.push({socket:socket,room:parsedMessage.payload.room})}


    
    console.log('Received message:', message)


})
socket.send('Hello from WebSocket server!')


})