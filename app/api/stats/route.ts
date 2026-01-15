import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current date info
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const [
    grammarCount,
    grammarUnderstood,
    vocabCount,
    learnedVocab,
    vocabThisWeek,
    essayCount,
    essays,
    errorCount,
    unresolvedErrors,
    studySessions
  ] = await Promise.all([
    prisma.grammarRule.count({ where: { userId: session.user.id } }),
    prisma.grammarRule.count({ where: { userId: session.user.id, status: 'understood' } }),
    prisma.vocabulary.count({ where: { userId: session.user.id } }),
    prisma.vocabulary.count({ where: { userId: session.user.id, learned: true } }),
    prisma.vocabulary.count({ 
      where: { 
        userId: session.user.id,
        createdAt: { gte: startOfWeek }
      } 
    }),
    prisma.essay.count({ where: { userId: session.user.id } }),
    prisma.essay.findMany({
      where: { userId: session.user.id },
      select: { wordCount: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.error.count({ where: { userId: session.user.id } }),
    prisma.error.count({ where: { userId: session.user.id, resolved: false } }),
    prisma.studySession.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' },
      take: 365
    })
  ])

  // Calculate streaks
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  let lastDate: Date | null = null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (const studySession of studySessions) {
    const sessionDate = new Date(studySession.date)
    sessionDate.setHours(0, 0, 0, 0)
    
    if (!lastDate) {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      if (sessionDate.getTime() === today.getTime() || sessionDate.getTime() === yesterday.getTime()) {
        currentStreak = 1
        tempStreak = 1
        lastDate = sessionDate
      } else {
        tempStreak = 1
        lastDate = sessionDate
      }
    } else {
      const dayDiff = Math.floor((lastDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (dayDiff === 1) {
        tempStreak++
        if (currentStreak > 0) currentStreak++
        lastDate = sessionDate
      } else {
        longestStreak = Math.max(longestStreak, tempStreak)
        tempStreak = 1
        lastDate = sessionDate
      }
    }
  }
  
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak)

  // Calculate days missed
  const totalDays = studySessions.length
  let daysMissed = 0
  if (studySessions.length > 0) {
    const firstSession = studySessions[studySessions.length - 1].date
    const daysSinceStart = Math.floor((now.getTime() - new Date(firstSession).getTime()) / (1000 * 60 * 60 * 24))
    daysMissed = Math.max(0, daysSinceStart - totalDays + 1)
  }

  // Calculate word count trend
  const wordCountTrend = essays.map((item) => ({
    date: item.createdAt,
    wordCount: item.wordCount
  }))

  return NextResponse.json({
    grammar: {
      total: grammarCount,
      understood: grammarUnderstood,
      needsWork: grammarCount - grammarUnderstood
    },
    vocabulary: {
      total: vocabCount,
      learned: learnedVocab,
      thisWeek: vocabThisWeek
    },
    essays: {
      total: essayCount,
      wordCountTrend
    },
    errors: {
      total: errorCount,
      unresolved: unresolvedErrors
    },
    streak: {
      current: currentStreak,
      longest: longestStreak,
      totalDays: totalDays,
      daysMissed: daysMissed
    }
  })
}
