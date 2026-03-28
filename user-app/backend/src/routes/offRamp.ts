import express from "express";
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware/middleware";

const prisma = new PrismaClient();
export const offRampRouter = Router();
offRampRouter.use(express.json());
offRampRouter.post("/offramp", authMiddleware, async(req, res) => {
const {amnount, provider}=req.body
const headers=req.headers.authorization
const jwtToken=headers!.split(' ')[1]
const decode=jwt.decode(jwtToken || '') as {userId:number} | null
const id=decode?.userId

})