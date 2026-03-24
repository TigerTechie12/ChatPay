import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken'
const app=express()
import {router} from './routes/auth'

const port=3000
app.use(cors());
app.use(express.json());
app.use("/api/v1",router)

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
})
