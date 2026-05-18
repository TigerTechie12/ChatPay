import express from 'express'
import cors from 'cors'
console.log('[startup] REDIS_URL is:', process.env.REDIS_URL ? 'SET (' + process.env.REDIS_URL.substring(0, 30) + '...)' : 'UNDEFINED')
console.log('[startup] DATABASE_URL is:', process.env.DATABASE_URL ? 'SET' : 'UNDEFINED')
console.log('[startup] JWT_SECRET is:', process.env.JWT_SECRET ? 'SET' : 'UNDEFINED')

const app=express()
import {router} from './routes/auth'
import {userRouter} from './routes/onRamp'
import {offRampRouter} from './routes/offRamp'
import {p2mRouter} from './routes/p2m'
import {walletPayRouter} from './routes/p2pW'

const port=3000
app.use(cors())
app.use(express.json())
app.use("/api/v1",router)
app.use("/api/v1",userRouter)
app.use("/api/v1",offRampRouter)
app.use("/api/v1",p2mRouter)
app.use("/api/v1",walletPayRouter)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
