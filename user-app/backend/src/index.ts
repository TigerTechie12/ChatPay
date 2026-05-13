import express from 'express'
import cors from 'cors'
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
