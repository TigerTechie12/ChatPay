import express from 'express'
import IOredis from 'ioredis'
import { PrismaClient } from '@prisma/client';
const prisma=PrismaClient()
const redis=new IOredis()
import cron from 'node-cron'
import { merchantWithdrawalQueue } from '../lib/queue';

cron.schedule("0 2 */2 * *",async()=>{
redis.set()
try{
const allMerchants=await prisma.merchant.findMany({where:{
    balance:{not:0},
    bankAccountNumber:{not:null},
    bankIfscCode:{not:null},
    offRampStatus:{notIn:['QUEUED','PROCESSING','FAILED','RETRYPENDING']}
},
select:{id:true}
})

if(allMerchants.length===0){return }
const allMerchantsId=allMerchants.map((m:any)=>{m.id})
for(let i=0; i<allMerchantsId.length; i++){

    await prisma.$transaction(async(tx:any)=>{

})

}



}
catch(e){}

})
