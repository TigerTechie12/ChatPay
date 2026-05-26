import { PrismaClient } from 'chatpay-db'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const conversations = await prisma.conversation.findMany({
    include: {
      participants: true,
      _count: { select: { messages: true } }
    },
    orderBy: { id: 'asc' }
  })

  // Group conversations by their sorted set of participant userIds
  const groups = new Map<string, any[]>()
  for (const c of conversations) {
    const key = c.participants
      .map((p: any) => p.userId)
      .sort((a: number, b: number) => a - b)
      .join('-')
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(c)
  }

  const toDelete: number[] = []
  for (const [key, convs] of groups) {
    if (convs.length <= 1) continue
    // Keep the conversation with the most messages; tie-break by lowest id (oldest)
    convs.sort((a, b) => (b._count.messages - a._count.messages) || (a.id - b.id))
    const keep = convs[0]
    const remove = convs.slice(1)
    console.log(`Pair ${key}: keeping #${keep.id} (${keep._count.messages} msgs), deleting #${remove.map((c) => c.id).join(', #')}`)
    toDelete.push(...remove.map((c) => c.id))
  }

  if (toDelete.length === 0) {
    console.log('No duplicate conversations found.')
    return
  }

  await prisma.message.deleteMany({ where: { conversationId: { in: toDelete } } })
  await prisma.conversationParticipant.deleteMany({ where: { conversationId: { in: toDelete } } })
  const res = await prisma.conversation.deleteMany({ where: { id: { in: toDelete } } })
  console.log(`Deleted ${res.count} duplicate conversations.`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
