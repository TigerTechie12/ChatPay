import jwt from 'jsonwebtoken'
const JWT_SECRET=process.env.JWT_SECRET || ""
import  type { Request,Response,NextFunction } from 'express'


export function authMiddleware(req:Request,res:Response,next:NextFunction):void{
const headers=req.headers.authorization
if(!headers || !headers.startsWith("Bearer")){
    res.json({message:"Unauthorized"})
    return
}
const token=headers.split(' ')[1]
if(!token){
    res.status(401).json({message:"Unauthorized"})
    return
}
try{
    const ifUser=jwt.verify(token,JWT_SECRET) as {userId:string}
    req.userId=ifUser.userId
    next()
}catch{
    res.status(401).json({message:"Unauthorized"})
}}