import { prisma } from './prisma'

/**
 * Automatically log a study session for today if one doesn't exist
 * This creates one session per day when user adds grammar/vocab/essay
 */
export async function logDailyStudySession(
  userId: string,
  activity: 'grammar' | 'vocabulary' | 'essay'
): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check if session already exists for today
  const existingSession = await prisma.studySession.findFirst({
    where: {
      userId,
      date: {
        gte: today,
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    },
  })

  if (!existingSession) {
    // Create new session for today
    await prisma.studySession.create({
      data: {
        userId,
        date: today,
        activities: [activity],
        duration: 30, // Default 30 minutes
      },
    })
  } else {
    // Update existing session to include this activity if not already present
    const activities = existingSession.activities as string[]
    if (!activities.includes(activity)) {
      await prisma.studySession.update({
        where: { id: existingSession.id },
        data: {
          activities: [...activities, activity],
        },
      })
    }
  }
}
