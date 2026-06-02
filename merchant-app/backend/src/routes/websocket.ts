import http from 'http'
import { WebSocketServer } from 'ws'
import jwt from 'jsonwebtoken'
import url from 'url'
import IORedis from 'ioredis'

const JWT_SECRET = process.env.JWT_SECRET as string

export function setupWebSocket(server: http.Server) {
    const wss = new WebSocketServer({noServer: true})

    server.on('upgrade', (req, socket, head) => {
        const {query} = url.parse(req.url as string, true)
        const token = query.token as string
        if(!token){
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
            socket.destroy()
            return
        }
        try{
            const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload
            ;(req as any).merchantId = decoded.merchantId ?? decoded.userId
            wss.handleUpgrade(req, socket as any, head as any, (ws) => {
                wss.emit('connection', ws, req)
            })
        } catch(e){
            console.error('Invalid token during WebSocket upgrade')
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
            socket.destroy()
        }
    })

    wss.on('connection', (socket, req: any) => {
        socket.on('error', (error: any) => console.error('WebSocket error:', error))
        const merchantId = req.merchantId
        const channel = `channel-${merchantId}`
        const subscriber = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {maxRetriesPerRequest: null})
        subscriber.on('error', (err) => console.error('[ws-redis]', err.message))

        subscriber.subscribe(channel, (err) => {
            if(err) console.error('Subscribe error:', err.message)
        })

        subscriber.on('message', (ch, message) => {
            if(ch === channel) socket.send(message)
        })

        socket.on('close', () => {
            subscriber.unsubscribe(channel)
            subscriber.quit()
        })
    })
}
