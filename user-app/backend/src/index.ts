import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { PrismaClient } from '@prisma/client';
import {UserSchema} from '../../../packages/common/src/index'
import jwt from 'jsonwebtoken'
const app=express()
const prisma = new PrismaClient();

app.use(cors());
app.use(bodyParser.json());