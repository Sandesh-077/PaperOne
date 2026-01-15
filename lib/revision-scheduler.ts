import { prisma } from './prisma'

/**
 * Schedule revisions based on the forgetting curve
 * Intervals: 1 day, 3 days, 7 days, 14 days, 30 days
 */
export async function scheduleRevisions(topicId: string): Promise<void> {
  const intervals = [1, 3, 7, 14, 30] // Days
  const now = new Date()

  // Delete existing unfinished revisions for this topic
  await prisma.revision.deleteMany({
    where: {
      topicId,
      completed: false,
    },
  })

  // Create new revisions
  for (const interval of intervals) {
    const scheduledFor = new Date(now)
    scheduledFor.setDate(scheduledFor.getDate() + interval)

    await prisma.revision.create({
      data: {
        topicId,
        scheduledFor,
        interval,
      },
    })
  }
}

/**
 * Get pending revisions for today or overdue
 */
export async function getPendingRevisions(userId: string) {
  const today = new Date()
  today.setHours(23, 59, 59, 999)

  const revisions = await prisma.revision.findMany({
    where: {
      topic: {
        subject: {
          userId,
        },
      },
      completed: false,
      scheduledFor: {
        lte: today,
      },
    },
    include: {
      topic: {
        include: {
          subject: true,
        },
      },
    },
    orderBy: {
      scheduledFor: 'asc',
    },
  })

  return revisions
}
