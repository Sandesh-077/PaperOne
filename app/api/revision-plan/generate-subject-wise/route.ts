import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { callGroq, parseJsonResponse } from '@/lib/ai-providers'
import type { SubjectWiseRevisionData, SubjectWisePlanDay, SubjectSessionInDay, RevisionPhase } from '@/types/planner'

export const dynamic = 'force-dynamic'

const SUBJECT_CODE_MAP: Record<string, string> = {
  '8021': 'English General Paper',
  '9701': 'Physics',
  '9702': 'Chemistry',
  '9709': 'Mathematics',
  '9618': 'Computer Science'
}

const PRIMARY_SUBJECTS = ['9701', '9702', '9709'] // Physics, Chemistry, Maths
const SECONDARY_SUBJECTS = ['9618', '8021'] // CS, GP

type RuntimeSubject = {
  subject: string
  subjectName: string
  papers: Array<{
    paperCode: string
    paperName: string
    examDate: string
    timeSlot: 'AM' | 'PM'
  }>
  previousScore?: number
  targetScore?: number
  paperTopics: Record<string, string[]>
}

function toIsoDateString(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input
  return date.toISOString().split('T')[0]
}

function enumerateDates(startDate: string, endDate: string): string[] {
  const result: string[] = []
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)

  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    result.push(toIsoDateString(cursor))
  }

  return result
}

function phaseForDay(index: number, totalDays: number): 'foundation' | 'blitz' | 'exam' {
  if (totalDays <= 0) return 'foundation'
  const foundationCutoff = Math.ceil(totalDays * 0.45)
  const blitzCutoff = Math.ceil(totalDays * 0.80)
  if (index < foundationCutoff) return 'foundation'
  if (index < blitzCutoff) return 'blitz'
  return 'exam'
}

function daysUntil(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime()
  const to = new Date(`${toIso}T00:00:00Z`).getTime()
  return Math.ceil((to - from) / 86400000)
}

function buildSubjectWisePrompt(
  today: string,
  firstExamDate: string,
  lastExamDate: string,
  primaries: RuntimeSubject[],
  secondaries: RuntimeSubject[],
  examCountdown: string,
  subjectDetails: string
): string {
  const totalDays = daysUntil(today, lastExamDate)

  return `You are an elite A-Level exam strategist. Build a 40-day study plan targeting 95%+ scores.

TODAY: ${today}
FIRST EXAM: ${firstExamDate}
LAST EXAM: ${lastExamDate}
TOTAL DAYS: ${totalDays}
STUDY HOURS/DAY: 4-6 hours

ROTATION PATTERN:
- Days 1, 3, 5, 7... (odd): Physics + Chemistry + Maths + Computer Science
- Days 2, 4, 6, 8... (even): Physics + Chemistry + Maths + English GP

PHASE BREAKDOWN (40 days):
- Days 1-18: Foundation Phase (45%) - Topic revision, common-topic consolidation
- Days 19-32: Blitz Phase (35%) - Topical past papers, weak-area targeting
- Days 33-40: Exam Phase (20%) - Full past papers only

SUBJECT FOCUS & TOPIC ALLOCATION RULES:
1. Physics (9701): Can do 2-3 chapters per day (no single-topic constraint)
2. Chemistry (9702): Organic Chemistry unit = 1 day only (high-marking). Other topics 2-3 per day
3. Maths (9709): Integration & Differentiation = 1 each per day. Other topics 2 per day. Paper 3 (Pure), Paper 4 (Mechanics) alternate
4. CS (9618): Follow paper-specific topics, 2-3 per day
5. English GP (8021): Essay practice + revision of weak structures, 1 essay per session

TOPICS FOR EACH SUBJECT:
${subjectDetails}

EXAM SCHEDULE:
${examCountdown}

ACTIVITY RULES:
- Foundation Phase: Primarily 'revision' (topic-wise learning)
- Blitz Phase: Mix of 'topical-past-paper' and 'revision' for weak areas
- Exam Phase: Only 'full-paper' (mixed timed papers)

OUTPUT REQUIREMENTS:
Generate a JSON array of 40 day-objects with this EXACT structure:
{
  "days": [
    {
      "dayNumber": 1,
      "date": "YYYY-MM-DD",
      "phase": "foundation|blitz|exam",
      "subjects": [
        {
          "subject": "9701|9702|9709|9618|8021",
          "subjectName": "Physics|Chemistry|Mathematics|Computer Science|English GP",
          "paperCode": "9701/21", // optional, for specific paper focus
          "topics": ["Chapter 1: Forces and Motion", "Chapter 2: Kinematics"],
          "activity": "revision|topical-past-paper|full-paper",
          "description": "Brief 1-line description of the task"
        }
      ]
    }
  ]
}

DO NOT include any text before or after the JSON array. Output ONLY valid JSON.`
}

async function buildSubjectWisePlan(
  today: string,
  firstExamDate: string,
  lastExamDate: string,
  primaries: RuntimeSubject[],
  secondaries: RuntimeSubject[],
  examsByDate: Map<string, any[]>,
  userId: string
): Promise<SubjectWiseRevisionData> {
  const dateRange = enumerateDates(today, lastExamDate)
  if (dateRange.length === 0) dateRange.push(today)

  // Build exam countdown text
  const examCountdown = Array.from(examsByDate.entries())
    .map(([date, exams]) => {
      const daysRemaining = daysUntil(today, date)
      const examList = exams.map((e) => `${e.subjectName} ${e.paperCode}`).join(', ')
      return `${date} [D-${daysRemaining}]: ${examList}`
    })
    .join('\n')

  // Build subject details text
  const subjectDetails = [
    ...primaries,
    ...secondaries
  ]
    .map((s) => {
      const paperDetails = Object.entries(s.paperTopics)
        .map(([paperCode, topics]) => {
          const topicList = topics.join(', ')
          return `  ${paperCode}: ${topicList}`
        })
        .join('\n')

      return `${s.subjectName} (${s.subject}):
${paperDetails}`
    })
    .join('\n\n')

  // Build Groq prompt
  const prompt = buildSubjectWisePrompt(
    today,
    firstExamDate,
    lastExamDate,
    primaries,
    secondaries,
    examCountdown,
    subjectDetails
  )

  // Call Groq
  let aiPlanRaw: any
  try {
    const groqResponse = await callGroq(prompt)
    aiPlanRaw = parseJsonResponse(groqResponse)
  } catch (error) {
    console.error('Groq API error:', error)
    aiPlanRaw = { days: [] }
  }

  // Normalize AI plan
  const days = (aiPlanRaw?.days || []).slice(0, 40).map((day: any, index: number) => {
    const dateIdx = Math.min(index, dateRange.length - 1)
    const dateIso = dateRange[dateIdx]

    const examsToday = examsByDate.get(dateIso) || []
    const phase = phaseForDay(index, 40)

    // Handle exam day
    let subjects: SubjectSessionInDay[] = []
    if (examsToday.length > 0 && day.subjects) {
      // Replace first subject with exam
      const examSubjects: SubjectSessionInDay[] = examsToday.map((exam) => ({
        subject: exam.subject,
        subjectName: exam.subjectName,
        paperCode: exam.paperCode,
        topics: [],
        activity: 'full-paper' as const,
        description: `EXAM DAY: ${exam.paperCode} ${exam.paperName} (${exam.timeSlot})`
      }))
      subjects = examSubjects
    } else if (Array.isArray(day.subjects) && day.subjects.length > 0) {
      // Use AI-generated subjects, ensure valid activity type
      subjects = day.subjects.map((s: any) => {
        const validActivities = ['revision', 'topical-past-paper', 'full-paper']
        const activity = validActivities.includes(s.activity)
          ? (s.activity as 'revision' | 'topical-past-paper' | 'full-paper')
          : ('revision' as const)
        return {
          subject: s.subject,
          subjectName: s.subjectName || SUBJECT_CODE_MAP[s.subject] || s.subject,
          paperCode: s.paperCode,
          topics: Array.isArray(s.topics) ? s.topics : [],
          activity,
          description: s.description || `${s.subjectName} - ${activity}`
        }
      })
    } else {
      // Fallback: minimal subjects
      subjects = primaries.slice(0, 3).map((s) => ({
        subject: s.subject,
        subjectName: s.subjectName,
        topics: ['General Revision'],
        activity: 'revision' as const,
        description: `${s.subjectName} - General revision`
      }))
    }

    return {
      date: dateIso,
      dayNumber: index + 1,
      phase,
      isExamDay: examsToday.length > 0,
      examEntries: examsToday,
      subjects
    }
  })

  // Ensure exactly 40 days
  while (days.length < 40) {
    const lastDay = days[days.length - 1]
    const nextDate = new Date(`${lastDay.date}T00:00:00Z`)
    nextDate.setUTCDate(nextDate.getUTCDate() + 1)
    const dayNum = days.length + 1

    days.push({
      date: toIsoDateString(nextDate),
      dayNumber: dayNum,
      phase: phaseForDay(dayNum - 1, 40),
      subjects: primaries.slice(0, 3).map((s) => ({
        subject: s.subject,
        subjectName: s.subjectName,
        topics: ['Review'],
        activity: 'revision' as const,
        description: `${s.subjectName} - Final review`
      }))
    })
  }

  const phases: RevisionPhase[] = [
    {
      name: 'foundation',
      label: 'Foundation',
      startDate: dateRange[0],
      endDate: dateRange[Math.ceil(40 * 0.45) - 1] || dateRange[dateRange.length - 1],
      description: 'Topic-wise revision with chapter consolidation'
    },
    {
      name: 'blitz',
      label: 'Blitz Phase',
      startDate: dateRange[Math.ceil(40 * 0.45)] || dateRange[0],
      endDate: dateRange[Math.ceil(40 * 0.80) - 1] || dateRange[dateRange.length - 1],
      description: 'Topical past papers and weak-area targeting'
    },
    {
      name: 'exam',
      label: 'Exam Phase',
      startDate: dateRange[Math.ceil(40 * 0.80)] || dateRange[0],
      endDate: dateRange[dateRange.length - 1],
      description: 'Full past paper practice'
    }
  ]

  return {
    phases,
    days,
    formatVersion: 'subject-wise'
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch exam entries
    const examEntries = await prisma.examEntry.findMany({
      where: { userId: user.id },
      orderBy: { examDate: 'asc' }
    })
    if (examEntries.length === 0) {
      return Response.json({ error: 'No exam entries found' }, { status: 400 })
    }

    const today = toIsoDateString(new Date())

    // Group by subject
    const subjectMap = new Map<
      string,
      {
        subject: string
        subjectName: string
        papers: { paperCode: string; paperName: string; examDate: string; timeSlot: 'AM' | 'PM' }[]
        previousScore?: number
        targetScore?: number
      }
    >()

    for (const entry of examEntries) {
      if (!subjectMap.has(entry.subject)) {
        subjectMap.set(entry.subject, {
          subject: entry.subject,
          subjectName: entry.subjectName || SUBJECT_CODE_MAP[entry.subject] || entry.subject,
          papers: [],
          previousScore: entry.previousScore,
          targetScore: entry.targetScore
        })
      }

      subjectMap.get(entry.subject)?.papers.push({
        paperCode: entry.paperCode,
        paperName: entry.paperName,
        examDate: toIsoDateString(entry.examDate),
        timeSlot: entry.timeSlot
      })
    }

    // Fetch paper topics
    const paperTopics = await prisma.paperTopic.findMany({
      where: { userId: user.id }
    })

    const paperTopicMap = new Map<string, string[]>()
    for (const pt of paperTopics) {
      const key = `${pt.subject}::${pt.paperCode}`
      if (!paperTopicMap.has(key)) {
        paperTopicMap.set(key, [])
      }
      paperTopicMap.get(key)?.push(pt.topicName)
    }

    // Build runtime subjects with topics
    const runtimeSubjects: RuntimeSubject[] = Array.from(subjectMap.values()).map((s) => ({
      ...s,
      paperTopics: Object.fromEntries(
        s.papers.map((p) => {
          const key = `${s.subject}::${p.paperCode}`
          return [p.paperCode, paperTopicMap.get(key) || []]
        })
      )
    }))

    const primaries = runtimeSubjects.filter((s) => PRIMARY_SUBJECTS.includes(s.subject))
    const secondaries = runtimeSubjects.filter((s) => SECONDARY_SUBJECTS.includes(s.subject))

    if (primaries.length === 0) {
      return Response.json({ error: 'Missing primary subjects (Physics, Chemistry, Maths)' }, { status: 400 })
    }

    // Build exam-by-date map
    const examsByDate = new Map<string, any[]>()
    for (const entry of examEntries) {
      const dateKey = toIsoDateString(entry.examDate)
      if (!examsByDate.has(dateKey)) examsByDate.set(dateKey, [])
      examsByDate.get(dateKey)?.push(entry)
    }

    const firstExamDate = toIsoDateString(examEntries[0].examDate)
    const lastExamDate = toIsoDateString(examEntries[examEntries.length - 1].examDate)

    // Build plan
    const planData = await buildSubjectWisePlan(
      today,
      firstExamDate,
      lastExamDate,
      primaries,
      secondaries,
      examsByDate,
      user.id
    )

    // Save to database
    await prisma.revisionPlan.deleteMany({ where: { userId: user.id } })

    const savedPlan = await prisma.revisionPlan.create({
      data: {
        userId: user.id,
        firstExamDate: new Date(firstExamDate),
        lastExamDate: new Date(lastExamDate),
        studyHoursPerDay: 5,
        isActive: true,
        planData: planData as any
      }
    })

    // Clear existing daily tasks
    await prisma.dailyTask.deleteMany({ where: { userId: user.id } })

    // Save daily tasks
    for (const day of planData.days) {
      for (const subject of day.subjects) {
        await prisma.dailyTask.create({
          data: {
            userId: user.id,
            date: new Date(day.date),
            sessionSlot: 'subject-wise',
            subject: subject.subject,
            subjectName: subject.subjectName,
            taskDesc: subject.description || `${subject.subjectName}: ${subject.topics.join(', ')}`,
            taskType: subject.activity,
            phase: day.phase,
            completed: false
          }
        })
      }
    }

    return Response.json({
      success: true,
      planId: savedPlan.id,
      plan: planData,
      message: 'Subject-wise plan generated successfully'
    })
  } catch (error: any) {
    console.error('Error generating subject-wise plan:', error)
    return Response.json({ error: error.message || 'Plan generation failed' }, { status: 500 })
  }
}
