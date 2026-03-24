import jwt from 'jsonwebtoken'
const JWT_SECRET=process.env.JWT_SECRET || ""
import  type { Request,Response,NextFunction } from 'express'


export function authMiddleware(req:Request,res:Response,next:NextFunction){
const headers=req.headers.authorization
if(!headers || !headers.startsWith("Bearer")){
    return res.json({message:"Unauthorized"})
}
const token:any=headers.split('')[1]
const ifUser=jwt.verify(token,JWT_SECRET)
if(ifUser){
    return next()
}
else{    return res.status(401).json({message:"Unauthorized"})
}}