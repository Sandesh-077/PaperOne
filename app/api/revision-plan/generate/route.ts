import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { callGroq, parseJsonResponse } from '@/lib/ai-providers'
import type { SubjectContext, RevisionPlanData } from '@/types/planner'

export const dynamic = 'force-dynamic'

const SUBJECT_CODE_MAP: Record<string, string> = {
  '8021': 'English General Paper',
  '9701': 'Physics',
  '9702': 'Chemistry',
  '9709': 'Mathematics',
  '9618': 'Computer Science'
}

const EXPECTED_PAPER_COUNTS: Record<string, number> = {
  '8021': 2,
  '9701': 5,
  '9702': 5,
  '9709': 2,
  '9618': 2
}

type RuntimeSubject = SubjectContext & {
  papers: Array<{
    paperCode: string
    paperName: string
    examDate: string
    timeSlot: 'AM' | 'PM'
  }>
  paperTopics: Record<string, string[]>
  commonTopics: string[]
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

function normalizeSlot(slot: string, index: number): 'morning' | 'afternoon' | 'evening' {
  const value = (slot || '').toLowerCase()
  if (value === 'morning' || value === 'afternoon' || value === 'evening') return value
  return ['morning', 'afternoon', 'evening'][index] as 'morning' | 'afternoon' | 'evening'
}

function normalizeType(type: string, phase: 'foundation' | 'blitz' | 'exam'): 'revision' | 'pastpaper' | 'practice' | 'rest' {
  const value = (type || '').toLowerCase()
  if (value === 'revision' || value === 'pastpaper' || value === 'practice' || value === 'rest') return value
  if (phase === 'foundation') return 'revision'
  if (phase === 'blitz') return 'pastpaper'
  return 'practice'
}

function daysUntil(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime()
  const to = new Date(`${toIso}T00:00:00Z`).getTime()
  return Math.ceil((to - from) / 86400000)
}

function computeCommonTopics(paperTopics: Record<string, string[]>): string[] {
  const topicToPapers = new Map<string, Set<string>>()
  for (const [paperCode, topics] of Object.entries(paperTopics)) {
    for (const topic of topics) {
      const normalized = topic.trim()
      if (!normalized) continue
      if (!topicToPapers.has(normalized)) {
        topicToPapers.set(normalized, new Set<string>())
      }
      topicToPapers.get(normalized)?.add(paperCode)
    }
  }

  return Array.from(topicToPapers.entries())
    .filter(([, papers]) => papers.size >= 2)
    .map(([topic]) => topic)
}

function buildFallbackTask(
  phase: 'foundation' | 'blitz' | 'exam',
  dateIso: string,
  slotIndex: number,
  subject: RuntimeSubject,
  paper: { paperCode: string; paperName: string; examDate: string; timeSlot: 'AM' | 'PM' }
): { task: string; type: 'revision' | 'pastpaper' | 'practice' | 'rest' } {
  const paperTopics = subject.paperTopics[paper.paperCode] || []
  const hasNoTopics = paperTopics.length === 0
  const topicPool = paperTopics.length > 0 ? paperTopics : subject.commonTopics
  const chosenTopic = topicPool.length > 0 ? topicPool[(slotIndex + dateIso.length) % topicPool.length] : null
  const examInDays = daysUntil(dateIso, paper.examDate)

  if (hasNoTopics) {
    if (phase === 'foundation') {
      return {
        task: `Revision for this paper: ${subject.subjectName} ${paper.paperCode} (${paper.paperName}).`,
        type: 'revision'
      }
    }

    if (phase === 'blitz') {
      return {
        task: `Do 1 timed paper: ${subject.subjectName} ${paper.paperCode} (${paper.paperName}), then mark and review mistakes.`,
        type: 'pastpaper'
      }
    }

    return {
      task: `Practice for this paper: ${subject.subjectName} ${paper.paperCode} (${paper.paperName}) and fix weak areas.`,
      type: 'practice'
    }
  }

  if (phase === 'foundation') {
    if (subject.commonTopics.length > 0 && slotIndex === 0) {
      const topicList = subject.commonTopics.slice(0, 3).join(', ')
      return {
        task: `Revise common ${subject.subjectName} topics across papers: ${topicList}. Build summary notes + active recall.`,
        type: 'revision'
      }
    }

    if (chosenTopic) {
      return {
        task: `Revise ${subject.subjectName} ${paper.paperCode} topic: ${chosenTopic}. Learn concepts then do focused questions.`,
        type: 'revision'
      }
    }

    return {
      task: `Revise core concepts for ${subject.subjectName} ${paper.paperCode} (${paper.paperName}) and make a weak-area checklist.`,
      type: 'revision'
    }
  }

  if (phase === 'blitz') {
    return {
      task: `Timed past paper drill: ${subject.subjectName} ${paper.paperCode} (${paper.paperName}), mark strictly and log every mistake.`,
      type: 'pastpaper'
    }
  }

  if (examInDays <= 1) {
    return {
      task: `Light review for ${subject.subjectName} ${paper.paperCode}: formulas/definitions, top mistakes, and exam strategy only.`,
      type: 'revision'
    }
  }

  return {
    task: `Targeted exam practice for ${subject.subjectName} ${paper.paperCode}: weak areas + mixed timed questions + correction pass.`,
    type: 'practice'
  }
}

function normalizeOrBuildPlan(
  rawPlanData: any,
  todayIso: string,
  lastExamDateIso: string,
  runtimeSubjects: RuntimeSubject[],
  examsByDate: Map<string, Array<{ subject: string; subjectName: string; paperCode: string; paperName: string; timeSlot: 'AM' | 'PM' }>>
): RevisionPlanData {
  let dateRange = enumerateDates(todayIso, lastExamDateIso)
  if (dateRange.length === 0) {
    dateRange = [todayIso]
  }

  const aiDayMap = new Map<string, any>()
  if (rawPlanData?.days && Array.isArray(rawPlanData.days)) {
    for (const day of rawPlanData.days) {
      if (day?.date) aiDayMap.set(day.date, day)
    }
  }

  const subjectsByPriority = [...runtimeSubjects].sort((a, b) => {
    const gapDiff = (b.gapSize || 0) - (a.gapSize || 0)
    if (gapDiff !== 0) return gapDiff
    const aNearest = Math.min(...a.papers.map((p) => daysUntil(todayIso, p.examDate)))
    const bNearest = Math.min(...b.papers.map((p) => daysUntil(todayIso, p.examDate)))
    return aNearest - bNearest
  })

  const normalizedDays = dateRange.map((dateIso, dayIndex) => {
    const defaultPhase = phaseForDay(dayIndex, dateRange.length)
    const aiDay = aiDayMap.get(dateIso)
    const phaseRaw = (aiDay?.phase || '').toLowerCase()
    const phase: 'foundation' | 'blitz' | 'exam' =
      phaseRaw === 'foundation' || phaseRaw === 'blitz' || phaseRaw === 'exam' ? phaseRaw : defaultPhase

    const examsToday = examsByDate.get(dateIso) || []
    const isExamDay = examsToday.length > 0

    const sessions = ['morning', 'afternoon', 'evening'].map((slot, slotIndex) => {
      if (isExamDay && slot === 'morning') {
        const exam = examsToday[0]
        return {
          slot,
          subject: exam.subject,
          subjectName: exam.subjectName,
          task: `EXAM DAY: ${exam.paperCode} ${exam.paperName} (${exam.timeSlot})`,
          type: 'rest' as const
        }
      }

      const aiSession = Array.isArray(aiDay?.sessions)
        ? aiDay.sessions.find((s: any) => normalizeSlot(s?.slot || '', slotIndex) === slot)
        : null

      if (aiSession?.subject && aiSession?.task) {
        const fallbackSubjectName = getSubjectNameFromCode(aiSession.subject, aiSession.subjectName)
        return {
          slot,
          subject: aiSession.subject,
          subjectName: fallbackSubjectName,
          task: String(aiSession.task),
          type: normalizeType(String(aiSession.type || ''), phase)
        }
      }

      const subject = subjectsByPriority[(dayIndex + slotIndex) % subjectsByPriority.length]
      const papersSorted = [...subject.papers].sort((a, b) => daysUntil(dateIso, a.examDate) - daysUntil(dateIso, b.examDate))
      const paper = papersSorted[0] || subject.papers[0]
      const fallback = buildFallbackTask(phase, dateIso, slotIndex, subject, paper)

      return {
        slot,
        subject: subject.subject,
        subjectName: subject.subjectName,
        task: fallback.task,
        type: fallback.type
      }
    })

    return {
      date: dateIso,
      phase,
      isExamDay,
      sessions
    }
  })

  const firstDate = dateRange[0]
  const foundationEnd = dateRange[Math.max(0, Math.ceil(dateRange.length * 0.45) - 1)]
  const blitzStart = dateRange[Math.max(0, Math.ceil(dateRange.length * 0.45))]
  const blitzEnd = dateRange[Math.max(0, Math.ceil(dateRange.length * 0.80) - 1)]
  const examStart = dateRange[Math.max(0, Math.ceil(dateRange.length * 0.80))]
  const lastDate = dateRange[dateRange.length - 1]

  return {
    phases: [
      {
        name: 'foundation',
        label: 'Foundation',
        startDate: firstDate,
        endDate: foundationEnd,
        description: 'Deep revision by subject with common-topic consolidation across papers.'
      },
      {
        name: 'blitz',
        label: 'Past Paper Blitz',
        startDate: blitzStart,
        endDate: blitzEnd,
        description: 'Paper-wise timed practice, strict marking, and error-log cycles.'
      },
      {
        name: 'exam',
        label: 'Exam Sharpener',
        startDate: examStart,
        endDate: lastDate,
        description: 'Final weak-area targeting, light pre-exam review, and exam execution readiness.'
      }
    ],
    days: normalizedDays
  }
}

function getSubjectNameFromCode(subjectCode: string, fallback?: string): string {
  return SUBJECT_CODE_MAP[subjectCode] || fallback || subjectCode
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  try {
    // STEP 2: Read studyHoursPerDay
    const body = await req.json()
    const studyHoursPerDay = body.studyHoursPerDay || 4

    // STEP 3: Fetch exam entries
    const prismaAny = prisma as any
    const examEntries = await prismaAny.examEntry.findMany({
      where: { userId: user.id },
      orderBy: { examDate: 'asc' }
    })

    if (examEntries.length === 0) {
      return NextResponse.json(
        { error: 'No exam entries found. Please add your exams first.' },
        { status: 400 }
      )
    }

    const paperTopics = await prismaAny.paperTopic.findMany({
      where: {
        userId: user.id
      },
      select: {
        subject: true,
        paperCode: true,
        topicName: true,
        topicOrder: true,
        confidenceScore: true,
        needsRevision: true,
        sessionsLogged: true
      },
      orderBy: [
        { paperCode: 'asc' },
        { topicOrder: 'asc' }
      ]
    })

    // STEP 4: Group by subject and build SubjectContext
    const subjectMap = new Map<string, any>()
    const paperTopicMap = new Map<string, any[]>()

    for (const topic of paperTopics) {
      const key = `${topic.subject}::${topic.paperCode}`
      if (!paperTopicMap.has(key)) {
        paperTopicMap.set(key, [])
      }
      paperTopicMap.get(key)?.push(topic)
    }

    for (const entry of examEntries) {
      if (!subjectMap.has(entry.subject)) {
        subjectMap.set(entry.subject, {
          subject: entry.subject,
          subjectName: getSubjectNameFromCode(entry.subject, entry.subjectName),
          papers: [],
          previousScore: entry.previousScore,
          targetScore: entry.targetScore
        })
      }

      const subjectContext = subjectMap.get(entry.subject)
      subjectContext.papers.push({
        paperCode: entry.paperCode,
        paperName: entry.paperName,
        examDate: toIsoDateString(entry.examDate),
        timeSlot: entry.timeSlot
      })
    }

    // Calculate gapSize and convert to array
    const subjects: RuntimeSubject[] = Array.from(subjectMap.values()).map((subj: any) => ({
      ...subj,
      gapSize: Math.max(0, (subj.targetScore || 95) - (subj.previousScore || 0)),
      paperTopics: {},
      commonTopics: []
    }))

    for (const subj of subjects) {
      const topicsByPaper: Record<string, string[]> = {}
      for (const paper of subj.papers) {
        const key = `${subj.subject}::${paper.paperCode}`
        const topicsForPaper = paperTopicMap.get(key) || []
        topicsByPaper[paper.paperCode] = topicsForPaper.map((t: any) => t.topicName)
      }
      subj.paperTopics = topicsByPaper
      subj.commonTopics = computeCommonTopics(topicsByPaper)
    }

    // Sort by gapSize descending (highest gap first = most urgent)
    subjects.sort((a, b) => (b.gapSize || 0) - (a.gapSize || 0))

    // STEP 5: Build AI prompt
    const today = toIsoDateString(new Date())
    const lastExamDate = toIsoDateString(examEntries[examEntries.length - 1].examDate)
    const firstExamDate = toIsoDateString(examEntries[0].examDate)

    const examsByDate = new Map<string, Array<{ subject: string; subjectName: string; paperCode: string; paperName: string; timeSlot: 'AM' | 'PM' }>>()
    for (const entry of examEntries) {
      const dateKey = toIsoDateString(entry.examDate)
      if (!examsByDate.has(dateKey)) examsByDate.set(dateKey, [])
      examsByDate.get(dateKey)?.push({
        subject: entry.subject,
        subjectName: getSubjectNameFromCode(entry.subject, entry.subjectName),
        paperCode: entry.paperCode,
        paperName: entry.paperName,
        timeSlot: entry.timeSlot
      })
    }

    const missingTopicPapers: Array<{ subject: string; subjectName: string; paperCode: string; paperName: string }> = []

    const subjectDetails = subjects
      .map((subj) => {
        const papersWithTopics = subj.papers
          .map((p: any) => {
            const key = `${subj.subject}::${p.paperCode}`
            const topicsForPaper = paperTopicMap.get(key) || []

            if (topicsForPaper.length === 0) {
              missingTopicPapers.push({
                subject: subj.subject,
                subjectName: subj.subjectName,
                paperCode: p.paperCode,
                paperName: p.paperName
              })
            }

            const commonTopicText = subj.commonTopics.length > 0 ? `\nCommonTopicsAcrossPapers: ${subj.commonTopics.join(', ')}` : ''

            const topicText =
              topicsForPaper.length > 0
                ? topicsForPaper
                    .map((t: any) => {
                      const needsFocus = t.needsRevision || t.confidenceScore <= 2
                      const focusTag = needsFocus ? ' [FOCUS]' : ''
                      return `${t.topicName}${focusTag}`
                    })
                    .join(', ')
                : 'NO_TOPICS_ADDED'

            const daysLeft = daysUntil(today, p.examDate)
            return `${p.paperCode} (${p.paperName}) on ${p.examDate} ${p.timeSlot} [D-${daysLeft}]\nTopics: ${topicText}${commonTopicText}`
          })
          .join('\n')

        return `Subject: ${subj.subjectName} (${subj.subject})
Papers:
${papersWithTopics}
Previous Score: ${subj.previousScore || 'N/A'}, Target: ${subj.targetScore || 'N/A'}, Gap: ${subj.gapSize || 0}`
      })
      .join('\n\n')

    const missingTopicsSummary =
      missingTopicPapers.length > 0
        ? missingTopicPapers
            .map((p) => `${p.subjectName} (${p.subject}) ${p.paperCode} - ${p.paperName}`)
            .join('\n')
        : 'NONE'

    const paperCoverageSummary = subjects
      .map((subj) => {
        const expected = EXPECTED_PAPER_COUNTS[subj.subject] || subj.papers.length
        const actual = subj.papers.length
        const status = actual >= expected ? 'OK' : `MISSING_${expected - actual}`
        return `${subj.subjectName} (${subj.subject}) -> Papers in DB: ${actual}/${expected} (${status})`
      })
      .join('\n')

    const examCountdownSummary = examEntries
      .map((entry: any) => {
        const examDateIso = toIsoDateString(entry.examDate)
        const countdown = daysUntil(today, examDateIso)
        return `${getSubjectNameFromCode(entry.subject, entry.subjectName)} (${entry.subject}) ${entry.paperCode} on ${examDateIso} ${entry.timeSlot} [D-${countdown}]`
      })
      .join('\n')

    const prompt = `You are an elite A-Level exam strategist. Build a high-performance plan targeting 95%+ in each paper where possible.

TODAY: ${today}
LAST EXAM: ${lastExamDate}
FIRST EXAM: ${firstExamDate}
STUDY HOURS PER DAY: ${studyHoursPerDay}
  GOAL: Maximize probability of country/world-top level performance through precise deliberate practice.

  SUBJECT/PAPER COVERAGE CHECK:
  ${paperCoverageSummary}

  EXAM COUNTDOWN:
  ${examCountdownSummary}

SUBJECTS:
${subjectDetails}

PAPERS WITH NO TOPICS ADDED:
${missingTopicsSummary}

INSTRUCTIONS:
1. Divide the plan into 3 phases in strict order:
  - Foundation (first 45% of days): revision by subject + concept mastery
  - Blitz (next 35% of days): paper-wise timed past paper cycles
  - Exam (last 20% of days): precision targeting of weak spots + exam readiness

2. Each day has exactly 3 sessions: morning, afternoon, evening
3. Each session has: slot (morning/afternoon/evening), subject, subjectName, task (specific action), type (revision/pastpaper/practice/rest)
4. The day before any exam should be light review only
5. On exam days, the morning session should be "EXAM DAY" with type "rest"
6. Subjects with larger score gaps and nearer exam dates should get more sessions per week
7. FOUNDATION must be SUBJECT-FIRST revision. If the same topic appears across multiple papers of same subject, schedule common-topic revision on the same day.
8. BLITZ and EXAM phases must be PAPER-WISE. Mention paperCode explicitly in task.
9. Tasks must be SPECIFIC and ACTIONABLE with measurable output (timed duration, mark + correction, error-log update)
10. Include EVERY day from ${today} to ${lastExamDate}
11. Use provided topic lists when available and prioritize [FOCUS] topics first in Foundation and Exam phases
12. If a paper has NO_TOPICS_ADDED, use ONLY simple paper-level tasks and do not invent topic names. Use wording like:
  - "Revision for this paper: [subject] [paperCode]"
  - "Do 1 timed paper: [subject] [paperCode]"
  - "Practice for this paper: [subject] [paperCode]"
13. Subject code determines subject identity exactly as:
   - 8021 = English General Paper
   - 9702 = Chemistry
   - 9701 = Physics
   - 9709 = Mathematics
   - 9618 = Computer Science
14. Maintain high-intensity but realistic workload suitable for ${studyHoursPerDay} hours/day split across 3 sessions.

RETURN ONLY VALID JSON, NO MARKDOWN, NO EXPLANATION:
{
  "phases": [
    {
      "name": "string",
      "label": "string",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "description": "string"
    }
  ],
  "days": [
    {
      "date": "YYYY-MM-DD",
      "phase": "foundation|blitz|exam",
      "isExamDay": boolean,
      "sessions": [
        {
          "slot": "morning|afternoon|evening",
          "subject": "string",
          "subjectName": "string",
          "task": "string",
          "type": "revision|pastpaper|practice|rest"
        }
      ]
    }
  ]
}`

    // STEP 6: Call Groq API
    let responseText = await callGroq(prompt, 8000)

    // STEP 7: Parse JSON response
    let rawPlanData: any
    try {
      rawPlanData = parseJsonResponse(responseText)
    } catch (parseError) {
      console.error('JSON Parse Error on first attempt:', parseError)
      const repairPrompt = `Fix the following broken JSON. Return ONLY valid JSON matching this shape:
{
  "phases": [{"name":"string","label":"string","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","description":"string"}],
  "days": [{"date":"YYYY-MM-DD","phase":"foundation|blitz|exam","isExamDay":boolean,"sessions":[{"slot":"morning|afternoon|evening","subject":"string","subjectName":"string","task":"string","type":"revision|pastpaper|practice|rest"}]}]
}

BROKEN_JSON:
${responseText}`

      try {
        responseText = await callGroq(repairPrompt, 8000)
        rawPlanData = parseJsonResponse(responseText)
      } catch (repairError) {
        console.error('JSON repair failed:', repairError)
        rawPlanData = null
      }
    }

    const planData = normalizeOrBuildPlan(rawPlanData, today, lastExamDate, subjects, examsByDate)

    // STEP 8: Save to database
    // Deactivate existing active plans
    await prismaAny.revisionPlan.updateMany({
      where: {
        userId: user.id,
        isActive: true
      },
      data: {
        isActive: false
      }
    })

    // Create new revision plan
    const revisionPlan = await prismaAny.revisionPlan.create({
      data: {
        userId: user.id,
        firstExamDate: new Date(firstExamDate),
        lastExamDate: new Date(lastExamDate),
        studyHoursPerDay,
        isActive: true,
        planData: planData
      }
    })

    // Create daily tasks for each day and session
    let totalTasks = 0
    for (const day of planData.days) {
      for (const session of day.sessions) {
        await prismaAny.dailyTask.create({
          data: {
            userId: user.id,
            planId: revisionPlan.id,
            date: new Date(`${day.date}T00:00:00Z`),
            sessionSlot: session.slot,
            subject: session.subject,
            subjectName: session.subjectName,
            taskDesc: session.task,
            taskType: session.type,
            phase: day.phase,
            completed: false
          }
        })
        totalTasks++
      }
    }

    // STEP 9: Return response
    return NextResponse.json({
      success: true,
      planId: revisionPlan.id,
      totalDays: planData.days.length,
      totalTasks
    })
  } catch (error) {
    console.error('Error generating revision plan:', error)
    return NextResponse.json(
      { error: 'Failed to generate revision plan' },
      { status: 500 }
    )
  }
}