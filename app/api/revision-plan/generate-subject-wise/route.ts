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
      // Fallback: Generate rotation-based plan using actual topics with paper references
      // Build topic pool per subject with paper code association
      type TopicWithPaper = { name: string; paperCode: string; paperName: string }
      const topicPool: Record<string, TopicWithPaper[]> = {}
      const topicIndices: Record<string, number> = {}
      
      for (const subj of [...primaries, ...secondaries]) {
        topicPool[subj.subject] = []
        topicIndices[subj.subject] = 0
        
        // Build list with paper association
        for (const [paperCode, topics] of Object.entries(subj.paperTopics)) {
          const paper = subj.papers.find(p => p.paperCode === paperCode)
          for (const topicName of topics) {
            topicPool[subj.subject].push({
              name: topicName,
              paperCode: paperCode,
              paperName: paper?.paperName || `Paper ${paperCode}`
            })
          }
        }
      }

      // Build fallback rotation with smart distribution per paper
      const isOddDay = index % 2 === 0
      const activePrimaries = primaries.slice(0, 3)
      const activeSecondary = isOddDay ? secondaries.find(s => s.subject === '9618') : secondaries.find(s => s.subject === '8021')

      subjects = []
      
      // Add primary subjects with smart allocation
      for (const primary of activePrimaries) {
        const allTopicsForSubj = topicPool[primary.subject] || []
        const startIdx = topicIndices[primary.subject] || 0
        
        // Smart allocation: Don't overload small papers
        let topicsForDay: TopicWithPaper[] = []
        let endIdx = startIdx + 2
        
        // Check if we're in a paper with few topics (like Mechanics P4 with 4 total)
        if (allTopicsForSubj.length > 0 && allTopicsForSubj.length <= 5) {
          // For small papers, take 1 topic at a time
          endIdx = startIdx + 1
          topicsForDay = allTopicsForSubj.slice(startIdx, endIdx)
        } else if (allTopicsForSubj.length > 0) {
          // For larger papers, take 2 topics
          topicsForDay = allTopicsForSubj.slice(startIdx, endIdx)
          
          // Wrap around if needed
          if (topicsForDay.length < 2 && allTopicsForSubj.length > 0) {
            topicsForDay = allTopicsForSubj.slice(0, Math.min(allTopicsForSubj.length, 2))
          }
        }
        
        topicIndices[primary.subject] = endIdx % Math.max(allTopicsForSubj.length, 1)
        
        // Format topics with paper reference
        const displayTopics = topicsForDay.map(t => {
          const paperNum = t.paperCode.split('/')[1] || t.paperCode
          return `${t.name} (P${paperNum})`
        })
        
        subjects.push({
          subject: primary.subject,
          subjectName: primary.subjectName,
          topics: displayTopics.length > 0 ? displayTopics : ['General Revision'],
          activity: (phase === 'exam' ? 'full-paper' : (phase === 'blitz' ? 'topical-past-paper' : 'revision')) as 'revision' | 'topical-past-paper' | 'full-paper',
          description: displayTopics.length > 0 ? `Revise: ${displayTopics.join(', ')}` : `${primary.subjectName} - General revision`
        })
      }
      
      // Add secondary subject with same smart logic
      if (activeSecondary) {
        const allTopicsForSubj = topicPool[activeSecondary.subject] || []
        const startIdx = topicIndices[activeSecondary.subject] || 0
        
        let topicsForDay: TopicWithPaper[] = []
        let endIdx = startIdx + 1 // Secondary subjects usually fewer topics
        
        if (allTopicsForSubj.length > 0) {
          topicsForDay = allTopicsForSubj.slice(startIdx, endIdx)
          if (topicsForDay.length === 0 && allTopicsForSubj.length > 0) {
            topicsForDay = allTopicsForSubj.slice(0, 1)
          }
        }
        
        topicIndices[activeSecondary.subject] = endIdx % Math.max(allTopicsForSubj.length, 1)
        
        // Format topics with paper reference
        const displayTopics = topicsForDay.map(t => {
          const paperNum = t.paperCode.split('/')[1] || t.paperCode
          return `${t.name} (P${paperNum})`
        })
        
        subjects.push({
          subject: activeSecondary.subject,
          subjectName: activeSecondary.subjectName,
          topics: displayTopics.length > 0 ? displayTopics : ['Review & Practice'],
          activity: (phase === 'exam' ? 'full-paper' : (phase === 'blitz' ? 'topical-past-paper' : 'revision')) as 'revision' | 'topical-past-paper' | 'full-paper',
          description: displayTopics.length > 0 ? `Revise: ${displayTopics.join(', ')}` : `${activeSecondary.subjectName} - Review & Practice`
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
  // Build topic indices and paper allocation for smart distribution
  type TopicWithMetadata = { 
    name: string
    paperCode: string // Primary paper
    paperName: string // Short name like "P1", "P2"
    allPaperCodes?: string[] // All papers this topic appears in
  }
  type SubjectTopicTracker = { 
    allTopics: TopicWithMetadata[]
    topicsByName: Map<string, TopicWithMetadata[]> // Group same topics by name
    currentIndex: number 
  }
  
  const topicTrackers: Record<string, SubjectTopicTracker> = {}
  
  // Flatten topics with paper metadata and group by topic name
  for (const subj of [...primaries, ...secondaries]) {
    const allTopics: TopicWithMetadata[] = []
    const topicsByName = new Map<string, TopicWithMetadata[]>()
    
    // Map paper codes: "21" -> "P1", "22" -> "P2", etc.
    const paperCodeMap: Record<string, string> = {}
    for (const paper of subj.papers) {
      const paperNum = paper.paperCode.split('/')[1]
      const paperPrefix = paperNum.startsWith('2') ? `P${parseInt(paperNum[1])}` : paperNum
      paperCodeMap[paperNum] = paperPrefix
    }
    
    // Build topics grouped by name
    const topicNameMap = new Map<string, string[]>() // topic name -> [paperCodes]
    for (const [paperCode, topics] of Object.entries(subj.paperTopics)) {
      for (const topic of topics) {
        if (!topicNameMap.has(topic)) topicNameMap.set(topic, [])
        topicNameMap.get(topic)?.push(paperCode)
      }
    }
    
    // Create flat list with paper tracking
    for (const [topicName, paperCodes] of topicNameMap) {
      for (let i = 0; i < paperCodes.length; i++) {
        const paperCode = paperCodes[i]
        allTopics.push({
          name: topicName,
          paperCode: paperCode,
          paperName: paperCodeMap[paperCode] || paperCode,
          allPaperCodes: paperCodes.map(pc => paperCodeMap[pc] || pc)
        })
      }
      
      // Also track by topic name
      if (!topicsByName.has(topicName)) topicsByName.set(topicName, [])
      topicsByName.get(topicName)?.push(...paperCodes.map((pc, idx) => ({
        name: topicName,
        paperCode: pc,
        paperName: paperCodeMap[pc] || pc,
        allPaperCodes: paperCodes.map(p => paperCodeMap[p] || p)
      } as TopicWithMetadata)))
    }
    
    topicTrackers[subj.subject] = { allTopics, topicsByName, currentIndex: 0 }
  }

  // Smart topic selection based on subject's topic count
  function getTopicsForDay(subject: string, phase: 'foundation' | 'blitz' | 'exam'): TopicWithMetadata[] {
    const tracker = topicTrackers[subject]
    if (!tracker || tracker.allTopics.length === 0) {
      return []
    }
    
    // Determine how many topics to assign based on subject and phase
    const totalTopics = tracker.allTopics.length
    let topicsToAssign = 2
    
    // Special rules for subjects with few chapters
    if (totalTopics <= 4) topicsToAssign = 1  // Mechanics, small modules
    else if (totalTopics <= 8) topicsToAssign = 1
    else if (phase === 'blitz') topicsToAssign = 2
    else if (phase === 'exam') topicsToAssign = 3
    
    // Get topics cycling through the list
    const selected: TopicWithMetadata[] = []
    for (let i = 0; i < topicsToAssign; i++) {
      const idx = (tracker.currentIndex + i) % tracker.allTopics.length
      selected.push(tracker.allTopics[idx])
    }
    
    tracker.currentIndex = (tracker.currentIndex + topicsToAssign) % tracker.allTopics.length
    return selected
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
      const topicsWithMetadata = getTopicsForDay(s.subject, phase)
      
      const activity: 'revision' | 'topical-past-paper' | 'full-paper' = 
        phase === 'exam' ? 'full-paper' : (phase === 'blitz' ? 'topical-past-paper' : 'revision')

      // Format topics with paper code: "FORCES (P1)", "KINEMATICS (P2)"
      const formattedTopics = topicsWithMetadata.map(t => ({
        name: t.name,
        paperCode: t.paperCode,
        paperName: t.paperName,
        allPaperCodes: t.allPaperCodes
      }))

      const topicDisplay = topicsWithMetadata
        .map(t => `${t.name} (${t.paperName})`)
        .join(', ')

      // Include paper names in description for topical past papers
      const description = topicDisplay.length > 0 
        ? (activity === 'topical-past-paper' 
          ? `${s.subjectName} ${s.subjectName === 'Physics' || s.subjectName === 'Chemistry' || s.subjectName === 'Mathematics' ? 'Topical' : ''} Past Paper: ${topicDisplay}`
          : `${s.subjectName}: ${topicDisplay}`)
        : `${s.subjectName} - General revision`

      return {
        subject: s.subject,
        subjectName: s.subjectName,
        topics: formattedTopics.length > 0 ? formattedTopics : [{ name: 'General Revision', paperCode: '' }],
        activity,
        description,
        isTopicalPastPaperFor: activity === 'topical-past-paper' ? topicsWithMetadata.map(t => t.name) : undefined,
        paperCodes: topicsWithMetadata.map(t => t.paperName).filter((v, i, a) => a.indexOf(v) === i) // unique
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

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })

    const prismaAny = prisma as any

    // Get active revision plan
    const plan = await prismaAny.revisionPlan.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { generatedAt: 'desc' }
    })

    if (!plan || !plan.planData) {
      return new Response(JSON.stringify({ error: 'No active plan found', plan: null }), { status: 404 })
    }

    // Get all daily tasks for this plan
    const tasks = await prismaAny.dailyTask.findMany({
      where: { planId: plan.id },
      orderBy: [{ date: 'asc' }, { subject: 'asc' }]
    })

    // Convert planData to proper format
    const planData = plan.planData as SubjectWiseRevisionData
    
    // Enhance plan with current completion status from tasks
    const enhancedDays = planData.days.map((day: SubjectWisePlanDay) => {
      const dayTasks = tasks.filter((t: any) => {
        const taskDate = new Date(t.date)
        const dayDate = new Date(day.date)
        return taskDate.toDateString() === dayDate.toDateString()
      })

      const enhancedSubjects = day.subjects.map((subject: SubjectSessionInDay) => {
        const taskForSubject = dayTasks.find((t: any) => t.subject === subject.subject)
        const topicsData = taskForSubject?.topics || subject.topics || []
        
        return {
          ...subject,
          topics: Array.isArray(topicsData) ? topicsData : (
            typeof topicsData === 'string' ? 
              [{ name: topicsData as string, paperCode: '', completed: false }] : 
              topicsData
          )
        }
      })

      return {
        ...day,
        subjects: enhancedSubjects
      }
    })

    return new Response(JSON.stringify({
      success: true,
      plan: {
        ...planData,
        days: enhancedDays
      },
      firstExamDate: plan.firstExamDate,
      lastExamDate: plan.lastExamDate
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (error: any) {
    console.error('Error fetching subject-wise plan:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
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

    // Save daily tasks with detailed topic information
    for (const day of planData.days) {
      for (const subject of day.subjects) {
        // Format topics with paperCode if available
        const topicsJson = subject.topics.map((t: any) => ({
          name: typeof t === 'string' ? t : t.name,
          paperCode: typeof t === 'string' ? '' : (t.paperCode || ''),
          completed: false,
          completedAt: null
        }))

        await prisma.dailyTask.create({
          data: {
            userId: user.id,
            planId: savedPlan.id,
            date: new Date(day.date),
            sessionSlot: 'subject-wise',
            subject: subject.subject,
            subjectName: subject.subjectName,
            taskDesc: subject.description || `${subject.subjectName}: ${subject.topics.map((t: any) => typeof t === 'string' ? t : t.name).join(', ')}`,
            taskType: subject.activity,
            activity: subject.activity,
            topics: topicsJson,
            dayNumber: day.dayNumber,
            phase: day.phase,
            completed: false
          } as any
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
