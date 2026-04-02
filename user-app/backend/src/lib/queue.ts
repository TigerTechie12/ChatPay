import {Queue} from 'bullmq';
import IORedis from 'ioredis';
const redisConnection = new IORedis()

export const withdrawalQueue=new Queue('withdrawalQueue')
export const p2pwithdrawalQueue=new Queue('p2pWithdrawalQueue')