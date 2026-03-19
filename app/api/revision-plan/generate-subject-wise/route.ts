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

  return `You are an elite A-Level exam strategist building a 40-day comprehensive study plan.

TODAY: ${today}
FIRST EXAM: ${firstExamDate}
LAST EXAM: ${lastExamDate}
TOTAL DAYS: ${totalDays}
GOAL: Target 95%+ scores across all papers

DAILY ROTATION (STRICT)
- ODD days (1,3,5,7...): Physics + Chemistry + Maths + ComputerScience
- EVEN days (2,4,6,8...): Physics + Chemistry + Maths + EnglishGP

40-DAY PHASE STRUCTURE:
- Days 1-18 (FOUNDATION 45%): Deep chapter-by-chapter revision
- Days 19-32 (BLITZ 35%): Topical past papers + weak-area drilling
- Days 33-40 (EXAM 20%): Full mixed timed papers only

CAMBRIDGE SYLLABUS TOPICS FOR EACH SUBJECT:
${subjectDetails}

EXAM SCHEDULE:
${examCountdown}

CRITICAL RULES FOR TOPIC ALLOCATION:
1. Physics (9701) - Cover these chapters: Circular Motion, Gravitation, Thermal Physics, Oscillations, Waves, Electric Fields, Magnetic Fields, Electromagnetic Induction, Nuclear Physics. Allocate 2-3 chapters per day.
2. Chemistry (9702) - Organic Chemistry (1 day ONLY - high-marking), Inorganic Chemistry, Physical Chemistry. Spread remaining topics 2-3 per day.
3. Maths (9709) - Paper 3 (Pure): Integration, Differentiation (1 each = 2 days), Vectors, Complex Numbers, Series. Paper 4 (Mechanics): Kinematics, Forces, Energy, Momentum. ALTERNATE papers daily. Each topic = 1 day if high-weight (Integration/Differentiation), else 2 topics per day.
4. Computer Science (9618) - Programming, Algorithms, Data Structures, Networks, Security, Ethics. 2-3 topics per day.
5. English GP (8021) - Essay techniques, argument structures, vocabulary development. 1 essay focus per day.

ACTIVITY TYPE RULES:
- Foundation phase: 100% "revision" (learning chapters)
- Blitz phase: 60% "topical-past-paper" + 40% "revision" 
- Exam phase: 100% "full-paper" (timed, mixed)

JSON OUTPUT FORMAT - Generate EXACTLY 40 day-objects with this structure:
{
  "days": [
    {
      "dayNumber": 1,
      "date": "2026-03-19",
      "phase": "foundation",
      "subjects": [
        {
          "subject": "9701",
          "subjectName": "Physics",
          "paperCode": "9701/21",
          "topics": ["1.1 Circular Motion", "1.2 Centripetal Force"],
          "activity": "revision",
          "description": "Revise circular motion: definitions, equations, practical examples"
        },
        {
          "subject": "9702",
          "subjectName": "Chemistry",
          "paperCode": "9702/21",
          "topics": ["2.1 Basic Atomic Structure", "2.2 Bonding"],
          "activity": "revision",
          "description": "Revise atomic structure and chemical bonding types"
        },
        {
          "subject": "9709",
          "subjectName": "Mathematics",
          "paperCode": "9709/71",
          "topics": ["Paper 3: Differentiation from first principles"],
          "activity": "revision",
          "description": "Deep dive: differentiation basics, product rule, quotient rule"
        },
        {
          "subject": "9618",
          "subjectName": "Computer Science",
          "paperCode": "9618/21",
          "topics": ["3.1 Programming Fundamentals", "3.2 Data Types"],
          "activity": "revision",
          "description": "Revise core programming concepts and data structures"
        }
      ]
    },
    {
      "dayNumber": 2,
      "date": "2026-03-20",
      "phase": "foundation",
      "subjects": [
        {
          "subject": "9701",
          "subjectName": "Physics",
          "paperCode": "9701/22",
          "topics": ["2.1 Gravitation", "2.2 Orbital Motion"],
          "activity": "revision",
          "description": "Revise Newton's law of gravitation, orbital mechanics, escape velocity"
        },
        {
          "subject": "9702",
          "subjectName": "Chemistry",
          "paperCode": "9702/22",
          "topics": ["3.1 Organic Chemistry Basics", "3.2 Alkanes"],
          "activity": "revision",
          "description": "Organic unit: basic reactions, naming conventions, alkane chemistry"
        },
        {
          "subject": "9709",
          "subjectName": "Mathematics",
          "paperCode": "9709/72",
          "topics": ["Paper 4: Kinematics equations", "Vectors basics"],
          "activity": "revision",
          "description": "Revise motion equations, displacement-time graphs, vector fundamentals"
        },
        {
          "subject": "8021",
          "subjectName": "English GP",
          "paperCode": "8021/11",
          "topics": ["Essay Structure", "Effective Arguments"],
          "activity": "revision",
          "description": "Practice essay writing: thesis clarity, paragraph development, transitions"
        }
      ]
    }
  ]
}

CRITICAL REMINDERS:
- Generate EXACTLY 40 days
- Alternate subjects on odd/even days STRICTLY
- Each subject gets 1-4 sessions per day max
- Topics must come FROM the syllabus provided
- Descriptions must be specific and actionable
- No repeated content between consecutive days for same subject

Output ONLY the JSON. No preamble, no markdown, no explanations.`
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
      // Fallback: Generate rotation-based plan using actual topics
      const allTopics: Record<string, string[]> = {}
      const topicIndices: Record<string, number> = {}
      
      // Collect all topics per subject
      for (const subj of [...primaries, ...secondaries]) {
        allTopics[subj.subject] = []
        topicIndices[subj.subject] = 0
        for (const topics of Object.values(subj.paperTopics)) {
          allTopics[subj.subject].push(...topics)
        }
      }

      // Build fallback rotation
      const isOddDay = index % 2 === 0 // index is 0-based, so 0,2,4 are "day 1,3,5"
      const activePrimaries = primaries.slice(0, 3)
      const activeSecondary = isOddDay ? secondaries.find(s => s.subject === '9618') : secondaries.find(s => s.subject === '8021')

      subjects = []
      
      // Add primary subjects
      for (const primary of activePrimaries) {
        const topics = allTopics[primary.subject] || []
        const startIdx = topicIndices[primary.subject] || 0
        const topicsForDay = topics.slice(startIdx, startIdx + 2)
        
        if (topicsForDay.length === 0 && topics.length > 0) {
          topicIndices[primary.subject] = 0
          topicsForDay.push(...topics.slice(0, 2))
        }
        
        topicIndices[primary.subject] = (startIdx + 2) % topics.length
        
        subjects.push({
          subject: primary.subject,
          subjectName: primary.subjectName,
          topics: topicsForDay.length > 0 ? topicsForDay : ['General Revision'],
          activity: (phase === 'exam' ? 'full-paper' : (phase === 'blitz' ? 'topical-past-paper' : 'revision')) as 'revision' | 'topical-past-paper' | 'full-paper',
          description: topicsForDay.length > 0 ? `Revise: ${topicsForDay.join(', ')}` : `${primary.subjectName} - General revision`
        })
      }
      
      // Add secondary subject
      if (activeSecondary) {
        const topics = allTopics[activeSecondary.subject] || []
        const startIdx = topicIndices[activeSecondary.subject] || 0
        const topicsForDay = topics.slice(startIdx, startIdx + 2)
        
        if (topicsForDay.length === 0 && topics.length > 0) {
          topicIndices[activeSecondary.subject] = 0
          topicsForDay.push(...topics.slice(0, 2))
        }
        
        topicIndices[activeSecondary.subject] = (startIdx + 2) % topics.length
        
        subjects.push({
          subject: activeSecondary.subject,
          subjectName: activeSecondary.subjectName,
          topics: topicsForDay.length > 0 ? topicsForDay : ['Practice & Review'],
          activity: (phase === 'exam' ? 'full-paper' : (phase === 'blitz' ? 'topical-past-paper' : 'revision')) as 'revision' | 'topical-past-paper' | 'full-paper',
          description: topicsForDay.length > 0 ? `Revise: ${topicsForDay.join(', ')}` : `${activeSecondary.subjectName} - Practice & Review`
        })
      }
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

  // Ensure exactly 40 days with intelligent topic cycling
  // Build topic indices for cycling through actual database topics
  const topicIndices: Record<string, number> = {}
  const allTopicsNeeded: Record<string, string[]> = {}
  
  for (const subj of [...primaries, ...secondaries]) {
    allTopicsNeeded[subj.subject] = []
    for (const topics of Object.values(subj.paperTopics)) {
      allTopicsNeeded[subj.subject].push(...topics)
    }
    topicIndices[subj.subject] = 0
  }

  while (days.length < 40) {
    const dayNum = days.length + 1
    const phase = phaseForDay(dayNum - 1, 40)
    const isOddDay = dayNum % 2 === 1

    // Determine which subjects for this day
    const subjectsForDay = isOddDay 
      ? primaries.slice(0, 3)  // Physics, Chemistry, Maths
      : [primaries[0], primaries[1], primaries[2], secondaries[0]]  // Physics, Chemistry, Maths, + Secondary

    let date: string
    if (days.length === 0) {
      date = toIsoDateString(today)
    } else {
      const lastDay = days[days.length - 1]
      const nextDate = new Date(`${lastDay.date}T00:00:00Z`)
      nextDate.setUTCDate(nextDate.getUTCDate() + 1)
      date = toIsoDateString(nextDate)
    }

    const subjects = subjectsForDay.map((s) => {
      const allTopics = allTopicsNeeded[s.subject] || []
      const startIdx = topicIndices[s.subject]
      const topicsForDay = allTopics.slice(startIdx, startIdx + 2)
      topicIndices[s.subject] = (startIdx + 2) % (allTopics.length || 1)

      const activity: 'revision' | 'topical-past-paper' | 'full-paper' = 
        phase === 'exam' ? 'full-paper' : (phase === 'blitz' ? 'topical-past-paper' : 'revision')

      return {
        subject: s.subject,
        subjectName: s.subjectName,
        topics: topicsForDay.length > 0 ? topicsForDay : ['General Revision'],
        activity,
        description: topicsForDay.length > 0 
          ? `${s.subjectName}: ${topicsForDay.join(', ')}`
          : `${s.subjectName} - General revision`
      }
    })

    days.push({
      date,
      dayNumber: dayNum,
      phase,
      subjects
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
          previousScore: entry.previousScore ?? undefined,
          targetScore: entry.targetScore ?? undefined
        })
      }

      subjectMap.get(entry.subject)?.papers.push({
        paperCode: entry.paperCode,
        paperName: entry.paperName,
        examDate: toIsoDateString(entry.examDate),
        timeSlot: entry.timeSlot as 'AM' | 'PM'
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
            planId: savedPlan.id,
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
