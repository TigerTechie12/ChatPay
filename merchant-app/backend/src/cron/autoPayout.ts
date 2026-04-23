import express from 'express'
import IOredis from 'ioredis'
import { PrismaClient } from '@prisma/client';
const prisma=new PrismaClient()
const redis=new IOredis()
import cron from 'node-cron'
import { merchantWithdrawalQueue } from '../lib/queue';

cron.schedule("0 2 */2 * *",async()=>{
try{const redisLock=await redis.set("payout-lock","running","EX",3600,"NX")
if(redisLock===null){return}
const allMerchants=await prisma.merchant.findMany({where:{
    
    bankAccountNumber:{not:null},
    bankIfscCode:{not:null},
    bankAccountName:{not:null}
    
},include:{
    merchantBalance:true,
    offRampTransaction:true
}
})

const filteredMerchants=allMerchants.filter((m:any)=>{const hasPending = m.offRampTransaction.some((mb: any) => {
    return mb.status === 'QUEUED' || mb.status === 'RETRYPENDING' || mb.status === 'PROCESSING'
  })
    return m.merchantBalance.amount !==0 && !hasPending
})

for(let i=0; i<filteredMerchants.length; i++){

try{
let offRampTransaction:any
await prisma.$transaction(async(txn:any)=>{

    const merchantId=filteredMerchants[i].id

    await txn.$queryRaw`SELECT * FROM "MerchantBalance" WHERE "merchantId"=${merchantId} FOR UPDATE `

    const merchantDetails= await txn.merchantBalance.findUnique({where:{merchantId:merchantId}})
    const increment=merchantDetails.amount
        const bankAccountName=filteredMerchants[i].bankAccountName
        const bankAccountNumber=filteredMerchants[i].bankAccountNumber
        const bankIfscCode=filteredMerchants[i].bankIfscCode
await txn.merchantBalance.update({where:{merchantId:merchantId},data:{
    locked:{increment:increment}
}})
offRampTransaction=await txn.offRampTransaction.create({
data:{
    amount:increment,
accountNumber:bankAccountNumber,
ifscCode:bankIfscCode,
provider:bankAccountName,
startedAt:new Date(),
merchantId:merchantId,
status:'QUEUED'
}})

})

await merchantWithdrawalQueue.add('offRampTxn',{offRampTxnId:offRampTransaction.id},{removeOnComplete:true,removeOnFail:{age:24*3600},attempts:5,backoff:{type:'fixed',delay:10000}},)

}catch(e){console.log(`Payout failed for merchant ${filteredMerchants[i].id}:`,e);continue}

}


}
catch(e){console.log(e)}

finally{redis.del("payout-lock")}
})
