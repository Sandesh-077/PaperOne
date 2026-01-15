import { prisma } from './prisma'

/**
 * Schedule revisions based on adaptive forgetting curve
 * Week 1: Daily or every 2 days (3 sessions total)
 * Week 2+: Increasing gaps (3, 5, 7, 14, 30 days)
 * 
 * Session pattern:
 * 1st: Next day (1 day)
 * 2nd: 2 days later (3 days total)
 * 3rd: 4 days later (7 days total)
 * 4th: 7 days later (14 days total)
 * 5th: 14 days later (28 days total)
 * 6th: 30 days later (58 days total)
 */
export async function scheduleRevisions(topicId: string): Promise<void> {
  const intervals = [
    { days: 1, session: 1 },   // Next day
    { days: 3, session: 2 },   // Day 3
    { days: 7, session: 3 },   // Day 7 (end of week 1)
    { days: 14, session: 4 },  // Day 14 (2 weeks)
    { days: 28, session: 5 },  // Day 28 (4 weeks)
    { days: 58, session: 6 },  // Day 58 (8+ weeks)
  ]
  const now = new Date()

  // Delete existing unfinished revisions for this topic
  await prisma.revision.deleteMany({
    where: {
      topicId,
      completed: false,
    },
  })

  // Create new revisions
  for (const { days, session } of intervals) {
    const scheduledFor = new Date(now)
    scheduledFor.setDate(scheduledFor.getDate() + days)

    await prisma.revision.create({
      data: {
        topicId,
        scheduledFor,
        sessionNumber: session,
        interval: days,
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
