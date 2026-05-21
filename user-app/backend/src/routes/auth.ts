import { Router } from 'express'
import { PrismaClient } from 'chatpay-db'
import { PrismaPg } from '@prisma/adapter-pg'
import { UserSchema } from 'shreyash-chatpay-common'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
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
  let numberBig: bigint
  try { numberBig = BigInt(number) } catch { return res.status(400).json({message: 'Invalid phone number'}) }
  try {
    const userExists = await prisma.user.findFirst({where: {OR: [{email}, {number: numberBig}]}})
    if (userExists) return res.status(409).json({message: 'User already exists'})
    const hashedPassword = await bcrypt.hash(password, 10)
    await prisma.user.create({data: {name, email, password: hashedPassword, number: numberBig}})
    res.status(201).json({message: 'User created'})
  } catch(e: any) {
    console.error('[signup error]', e?.message, e?.code, e?.meta)
    res.status(500).json({message: 'Error creating user', error: e?.message})
  }
})

router.post('/signin', authRateLimiter, async(req, res) => {
  const {email, password} = req.body as {email?: string; password?: string}
  if (!email || !password) return res.status(400).json({message: 'Email and password required'})
  try {
    const user: any = await prisma.user.findUnique({where: {email}})
    if (!user) return res.status(404).json({message: 'User not found'})
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) return res.status(401).json({message: 'Invalid credentials'})
    await redis.del(`blacklist:${user.id}`)
    const minutes = new Date().getMinutes()
    const token = jwt.sign(
      {name: user.name, email, userId: user.id, time: minutes, jti: randomUUID(), exp: Math.floor(Date.now()/1000) + 3600},
      JWT_SECRET
    )
    res.status(200).json({message: 'Signed in', token})
  } catch(e: any) {
    res.status(500).json({message: 'Error signing in'})
  }
})

router.post('/signout', authMiddleware, async(req: any, res) => {
  const remaining = Math.max(0, (req.exp ?? 0) - Math.floor(Date.now()/1000))
  if (remaining > 0 && req.jti) {
    await redis.set(`blacklist:${req.jti}`, 'true', 'EX', remaining)
  }
  res.status(200).json({message: 'Signed out'})
})

router.get('/me', authMiddleware, async(req: any, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {id: req.userId},
      select: {id: true, name: true, email: true, number: true}
    })
    if (!user) return res.status(404).json({message: 'User not found'})
    return res.json({...user, number: user.number?.toString() ?? null})
  } catch(e: any) {
    return res.status(500).json({message: 'Error fetching profile'})
  }
})

router.get('/users/search', authMiddleware, async(req: any, res) => {
  const q = ((req.query.q as string) ?? '').trim()
  if (q.length < 2) return res.json({users: []})
  try {
    const isNumber = /^\d+$/.test(q)
    const users: any[] = await prisma.user.findMany({
      where: {
        AND: [
          {id: {not: req.userId}},
          isNumber
            ? {number: BigInt(q)}
            : {name: {contains: q, mode: 'insensitive'}}
        ]
      },
      select: {id: true, name: true, number: true},
      take: 10
    })
    return res.json({users: users.map(u => ({...u, number: u.number?.toString() ?? null}))})
  } catch(e: any) {
    return res.status(500).json({message: 'Error searching users'})
  }
})
