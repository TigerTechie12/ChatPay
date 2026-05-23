
import { PrismaClient } from 'chatpay-db'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({connectionString: process.env.DATABASE_URL})
const prisma = new PrismaClient({adapter})
import redis from "../lib/redis"
import cron from 'node-cron'
import { merchantWithdrawalQueue } from '../lib/queue'

cron.schedule("0 2 */2 * *",async()=>{
try{const redisLock=await redis.set("payout-lock","running","EX",3600,"NX")
if(redisLock===null){return}
const allMerchants=await prisma.merchant.findMany({where:{
    bankAccountNumber:{not:null},
    bankIfscCode:{not:null},
    bankAccountName:{not:null}
},include:{
    MerchantBalance:true,
    OffRampTransaction:true
}
})

const filteredMerchants=allMerchants.filter((m:any)=>{const hasPending = m.OffRampTransaction.some((mb: any) => {
    return mb.status === 'QUEUED' || mb.status === 'RETRYPENDING' || mb.status === 'PROCESSING'
  })
    return m.MerchantBalance?.amount !==0 && !hasPending
})

for(const merchant of filteredMerchants){

try{
let offRampTransaction:any
const {id: merchantId, bankAccountNumber, bankIfscCode} = merchant
await prisma.$transaction(async(txn:any)=>{
    await txn.$queryRaw`SELECT * FROM "MerchantBalance" WHERE "merchantId"=${merchantId} FOR UPDATE`

    const merchantDetails= await txn.merchantBalance.findUnique({where:{merchantId}})
    if(!merchantDetails) throw new Error('Merchant balance not found')
    const increment=merchantDetails.amount
await txn.merchantBalance.update({where:{merchantId},data:{
    locked:{increment}
}})
offRampTransaction=await txn.offRampTransaction.create({
data:{
    amount:increment,
    accountNumber:bankAccountNumber ?? '',
    ifscCode:bankIfscCode ?? '',
    startedAt:new Date(),
    merchantId,
    status:'QUEUED'
}})

})

await merchantWithdrawalQueue.add('offRampTxn',{offRampTxnId:offRampTransaction.id},{jobId:`offramp-${offRampTransaction.id}`,removeOnComplete:true,removeOnFail:{age:24*3600},attempts:5,backoff:{type:'fixed',delay:10000}})

}catch(e){console.log(`Payout failed for merchant ${merchant.id}:`,e);continue}

}


}
catch(e){console.log(e)}

finally{redis.del("payout-lock")}
})
