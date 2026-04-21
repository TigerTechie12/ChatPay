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
include:{
    bankAccountNumber:true,
    bankIfscCode:true,
    bankAccountName:true,
    id:true
}
})
const allMerchantsId=allMerchants.map((m:any)=>{return m.id})

for(let i=0; i<allMerchantsId.length; i++){
await prisma.$transaction(async(txn:any)=>{
    const id=`${allMerchantsId[i]}`
    await txn.$queryRaw`SELECT * FROM "MerchantBalance" WHERE "merchantId"=${allMerchantsId[i]} FOR UPDATE `
    
    const merchantDetails= await txn.merchantBalance.findUnique({where:`${allMerchantsId[i]}`})
    
    const increment=merchantDetails.amount                                             
        const bankAccountName=merchantDetails.bankAccountName
        const bankAccountNumber=merchantDetails.bankAccountNumber
        const bankIfscCode=merchantDetails.bankIfscCode
await txn.merchantBalance.update({where:`${allMerchantsId[i]}`,data:{
    locked:{increment:{increment}}
}})
const offRampTransaction=await txn.offRampTransaction.create({
amount:increment,
accountNumber:bankAccountNumber,
ifscCode:bankIfscCode,
provider:bankAccountName,
startedAt:Date.now(),
merchantId:id
})


await merchantWithdrawalQueue.add('offRampTxn',{offRampTxnId:offRampTransaction.id},{removeOnComplete:true,removeOnFail:{age:24*3600},attempts:5,backoff:{type:'fixed',delay:10000}},)
await merchantWithdrawalQueue.setGlobalRateLimit(1,1000)
})
}


}
catch(e){console.log(e)}

finally{redis.del()}
})
