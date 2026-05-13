import { Router } from 'express'
import { PrismaClient } from 'chatpay-db'
import { PrismaPg } from '@prisma/adapter-pg'
import { UserSchema } from 'shreyash-chatpay-common'
import jwt from 'jsonwebtoken'
import redis from '../lib/redis'
import { authMiddleware } from 'chatpay-middleware'
import { rateLimitMiddleware } from '../lib/rateLimiter'

export const router = Router()
const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})
const JWT_SECRET = process.env.JWT_SECRET || ""

const authRateLimiter = rateLimitMiddleware('auth', 5, 60)

router.post('/signup', authRateLimiter, async(req, res) => {
  const parsed = UserSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({message: parsed.error.issues[0]?.message ?? 'Invalid input'})
  }
  const {name, email, password, number} = parsed.data
  const numberInt = parseInt(number, 10)
  if (isNaN(numberInt)) return res.status(400).json({message: 'Invalid phone number'})
  try {
    const userExists = await prisma.user.findFirst({where: {OR: [{email}, {number: numberInt}]}})
    if (userExists) return res.status(409).json({message: 'User already exists'})
    await prisma.user.create({data: {name, email, password, number: numberInt}})
    res.status(201).json({message: 'User created'})
  } catch(e: any) {
    res.status(500).json({message: 'Error creating user'})
  }
})

router.post('/signin', authRateLimiter, async(req, res) => {
  const {email, password} = req.body as {email?: string; password?: string}
  if (!email || !password) return res.status(400).json({message: 'Email and password required'})
  try {
    const user: any = await prisma.user.findUnique({where: {email}})
    if (!user) return res.status(404).json({message: 'User not found'})
    if (user.password !== password) return res.status(401).json({message: 'Invalid credentials'})
    const minutes = new Date().getMinutes()
    const token = jwt.sign(
      {name: user.name, email, userId: user.id, time: minutes, exp: Math.floor(Date.now()/1000) + 3600},
      JWT_SECRET
    )
    res.status(200).json({message: 'Signed in', token})
  } catch(e: any) {
    res.status(500).json({message: 'Error signing in'})
  }
})

router.post('/signout', authMiddleware, async(req, res) => {
  const remaining = Math.max(0, (req.exp ?? 0) - Math.floor(Date.now()/1000))
  if (remaining > 0) {
    await redis.set(`blacklist:${req.userId}`, 'true', 'EX', remaining)
  }
  res.status(200).json({message: 'Signed out'})
})
