import {Queue} from 'bullmq';
import IORedis from 'ioredis';
const redisConnection = new IORedis()

export const merchantWithdrawalQueue=new Queue('merchantWithdrawalQueue',{connection:redisConnection})
