import type { PrismaPg } from '@prisma/adapter-pg'

declare module 'chatpay-db' {
  export class PrismaClient {
    constructor(options: { adapter: PrismaPg })
    onRampTransaction: {
      findUnique(args: { where: { token: string | undefined } }): Promise<{ userId: number } | null>
      update(args: { where: { token: string | undefined }, data: { status: string } }): Promise<unknown>
    }
    balance: {
      update(args: { where: { userId: number }, data: { amount: { increment: number | null } } }): Promise<unknown>
    }
    $transaction(operations: Promise<unknown>[]): Promise<unknown[]>
  }
}
