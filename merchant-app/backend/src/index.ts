import http from 'http'
import express from 'express'
import cors from 'cors'
import {authRouter} from './routes/auth'
import {dashboardRouter} from './routes/dashboard'
import {payOutRouter} from './routes/payoutManual'
import {qrRouter} from './routes/qr'
import {settingsRouter} from './routes/settings'
import {setupWebSocket} from './routes/websocket'

const app = express()
const server = http.createServer(app)

app.use(cors())
app.use(express.json())
app.use("/api/v1", authRouter)
app.use("/api/v1", dashboardRouter)
app.use("/api/v1", payOutRouter)
app.use("/api/v1", qrRouter)
app.use("/api/v1", settingsRouter)

setupWebSocket(server)

const port = process.env.PORT || 3001
server.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
