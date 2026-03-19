import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { callGroq, parseJsonResponse } from '@/lib/ai-providers'

type SessionSlot = 'morning' | 'afternoon' | 'evening'
type TaskType = 'revision' | 'pastpaper' | 'practice' | 'rest'
type PlanPhase = 'exam'

type ExamRow = {
  subject: string
  subjectName: string
  paperCode: string
  paperName: string
  examDate: Date
  timeSlot: 'AM' | 'PM'
  previousScore?: number | null
  targetScore?: number | null
}

type SubjectProfile = {
  subject: string
  subjectName: string
  readiness: number
  strictness: 'strict' | 'balanced' | 'maintenance'
  papers: Array<{
    paperCode: string
    paperName: string
    examDate: string
    timeSlot: 'AM' | 'PM'
  }>
  paperTopics: Record<string, string[]>
}

const SUBJECT_CODE_MAP: Record<string, string> = {
  '8021': 'English General Paper',
  '9701': 'Physics',
  '9702': 'Chemistry',
  '9709': 'Mathematics',
  '9618': 'Computer Science'
}

function getSubjectNameFromCode(subjectCode: string, fallback?: string): string {
  return SUBJECT_CODE_MAP[subjectCode] || fallback || subjectCode
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

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime()
  const to = new Date(`${toIso}T00:00:00Z`).getTime()
  return Math.ceil((to - from) / 86400000)
}

function normalizeSlot(slot: string, index: number): SessionSlot {
  const value = (slot || '').toLowerCase()
  if (value === 'morning' || value === 'afternoon' || value === 'evening') return value as SessionSlot
  return ['morning', 'afternoon', 'evening'][index] as SessionSlot
}

function normalizeType(type: string): TaskType {
  const value = (type || '').toLowerCase()
  if (value === 'revision' || value === 'pastpaper' || value === 'practice' || value === 'rest') return value as TaskType
  return 'practice'
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function summarizeStrictness(readiness: number): 'strict' | 'balanced' | 'maintenance' {
  if (readiness < 65) return 'strict'
  if (readiness < 82) return 'balanced'
  return 'maintenance'
}

function buildFallbackTask(
  subjectProfile: SubjectProfile,
  paper: { paperCode: string; paperName: string; examDate: string; timeSlot: 'AM' | 'PM' },
  dateIso: string,
  isDayBeforeExam: boolean
): { task: string; type: TaskType } {
  const topics = subjectProfile.paperTopics[paper.paperCode] || []
  const hasTopics = topics.length > 0
  const daysToPaper = daysBetween(dateIso, paper.examDate)

  if (!hasTopics) {
    if (isDayBeforeExam) {
      return {
        task: `Revision for this paper: ${subjectProfile.subjectName} ${paper.paperCode}. Light review only.`,
        type: 'revision'
      }
    }

    if (daysToPaper <= 3) {
      return {
        task: `Practice for this paper: ${subjectProfile.subjectName} ${paper.paperCode} and fix weak areas.`,
        type: 'practice'
      }
    }

    return {
      task: `Do 1 timed paper: ${subjectProfile.subjectName} ${paper.paperCode}, then mark and review mistakes.`,
      type: 'pastpaper'
    }
  }

  const focusTopic = topics[(dateIso.length + paper.paperCode.length) % topics.length]

  if (isDayBeforeExam) {
    return {
      task: `Light revision for ${subjectProfile.subjectName} ${paper.paperCode}: key formulas/definitions + ${focusTopic}.`,
      type: 'revision'
    }
  }

  if (subjectProfile.strictness === 'strict') {
    if (daysToPaper <= 3) {
      return {
        task: `Strict weak-area practice: ${subjectProfile.subjectName} ${paper.paperCode} topic ${focusTopic} + correction loop.`,
        type: 'practice'
      }
    }

    return {
      task: `Strict timed paper cycle: ${subjectProfile.subjectName} ${paper.paperCode}; do 1 paper, mark hard, update error log.`,
      type: 'pastpaper'
    }
  }

  if (subjectProfile.strictness === 'balanced') {
    if (daysToPaper <= 3) {
      return {
        task: `Focused practice for ${subjectProfile.subjectName} ${paper.paperCode}: ${focusTopic} + mixed questions.`,
        type: 'practice'
      }
    }

    return {
      task: `Timed paper practice: ${subjectProfile.subjectName} ${paper.paperCode}, then targeted correction on ${focusTopic}.`,
      type: 'pastpaper'
    }
  }

  if (daysToPaper <= 2) {
    return {
      task: `Light readiness check for ${subjectProfile.subjectName} ${paper.paperCode}: quick mixed questions + confidence review.`,
      type: 'practice'
    }
  }

  return {
    task: `Maintenance drill: ${subjectProfile.subjectName} ${paper.paperCode}, quality over volume and clean execution.`,
    type: 'practice'
  }
}

function normalizeExamModePlan(
  rawPlanData: any,
  startDateIso: string,
  lastExamDateIso: string,
  subjectProfiles: SubjectProfile[],
  examsByDate: Map<string, Array<{ subject: string; subjectName: string; paperCode: string; paperName: string; timeSlot: 'AM' | 'PM' }>>
) {
  let dateRange = enumerateDates(startDateIso, lastExamDateIso)
  if (dateRange.length === 0) dateRange = [startDateIso]

  const aiDayMap = new Map<string, any>()
  if (rawPlanData?.days && Array.isArray(rawPlanData.days)) {
    for (const day of rawPlanData.days) {
      if (day?.date) aiDayMap.set(day.date, day)
    }
  }

  const subjectsPriority = [...subjectProfiles].sort((a, b) => {
    if (a.readiness !== b.readiness) return a.readiness - b.readiness
    const aNearest = Math.min(...a.papers.map((p) => daysBetween(startDateIso, p.examDate)))
    const bNearest = Math.min(...b.papers.map((p) => daysBetween(startDateIso, p.examDate)))
    return aNearest - bNearest
  })

  const days = dateRange.map((dateIso, dayIndex) => {
    const aiDay = aiDayMap.get(dateIso)
    const examsToday = examsByDate.get(dateIso) || []

    const nextDate = new Date(`${dateIso}T00:00:00Z`)
    nextDate.setUTCDate(nextDate.getUTCDate() + 1)
    const tomorrowIso = toIsoDateString(nextDate)
    const hasExamTomorrow = (examsByDate.get(tomorrowIso) || []).length > 0

    const sessions: Array<{ slot: SessionSlot; subject: string; subjectName: string; task: string; type: TaskType }> =
      ['morning', 'afternoon', 'evening'].map((slot, slotIndex) => {
        // Hard rule: exam slots for same-day exams
        if (examsToday.length > 0 && slotIndex === 0) {
          const exam = examsToday[0]
          return {
            slot: 'morning',
            subject: exam.subject,
            subjectName: exam.subjectName,
            task: `EXAM DAY: ${exam.paperCode} ${exam.paperName} (${exam.timeSlot})`,
            type: 'rest'
          }
        }

        if (examsToday.length > 1 && slotIndex === 1) {
          const exam = examsToday[1]
          return {
            slot: 'afternoon',
            subject: exam.subject,
            subjectName: exam.subjectName,
            task: `EXAM DAY: ${exam.paperCode} ${exam.paperName} (${exam.timeSlot})`,
            type: 'rest'
          }
        }

        // Hard rule: day before exam => light review only
        if (hasExamTomorrow) {
          const nearestExam = (examsByDate.get(tomorrowIso) || [])[0]
          return {
            slot: normalizeSlot(slot, slotIndex),
            subject: nearestExam.subject,
            subjectName: nearestExam.subjectName,
            task: `Light review only for tomorrow: ${nearestExam.paperCode} ${nearestExam.paperName} (key points + calm recall).`,
            type: 'revision'
          }
        }

        const aiSession = Array.isArray(aiDay?.sessions)
          ? aiDay.sessions.find((s: any) => normalizeSlot(s?.slot || '', slotIndex) === normalizeSlot(slot, slotIndex))
          : null

        if (aiSession?.subject && aiSession?.task) {
          return {
            slot: normalizeSlot(aiSession.slot || slot, slotIndex),
            subject: String(aiSession.subject),
            subjectName: getSubjectNameFromCode(String(aiSession.subject), String(aiSession.subjectName || '')),
            task: String(aiSession.task),
            type: normalizeType(String(aiSession.type || 'practice'))
          }
        }

        const subjectProfile = subjectsPriority[(dayIndex + slotIndex) % subjectsPriority.length]
        const nearestPaper = [...subjectProfile.papers].sort((a, b) => daysBetween(dateIso, a.examDate) - daysBetween(dateIso, b.examDate))[0]
        const fallback = buildFallbackTask(subjectProfile, nearestPaper, dateIso, false)

        return {
          slot: normalizeSlot(slot, slotIndex),
          subject: subjectProfile.subject,
          subjectName: subjectProfile.subjectName,
          task: fallback.task,
          type: fallback.type
        }
      })

    return {
      date: dateIso,
      phase: 'exam' as PlanPhase,
      isExamDay: examsToday.length > 0,
      sessions
    }
  })

  return {
    phases: [
      {
        name: 'exam',
        label: 'Exam Mode',
        startDate: dateRange[0],
        endDate: dateRange[dateRange.length - 1],
        description: 'Adaptive exam-phase plan based on mastery, paper performance, and upcoming exam load.'
      }
    ],
    days,
    meta: {
      mode: 'exam'
    }
  }
}

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const prismaAny = prisma as any
    const body = await req.json().catch(() => ({}))

    const examEntries: ExamRow[] = await prismaAny.examEntry.findMany({
      where: { userId: user.id },
      orderBy: { examDate: 'asc' }
    })

    if (examEntries.length === 0) {
      return NextResponse.json({ error: 'No exam entries found.' }, { status: 400 })
    }

    const now = new Date()
    const today = toIsoDateString(now)
    const firstExamIso = toIsoDateString(examEntries[0].examDate)
    const lastExamIso = toIsoDateString(examEntries[examEntries.length - 1].examDate)
    const daysUntilFirstExam = daysBetween(today, firstExamIso)

    if (daysUntilFirstExam > 2) {
      return NextResponse.json(
        { error: 'Exam Mode can be activated only within 2 days before first exam.', daysUntilFirstExam },
        { status: 400 }
      )
    }

    // Topic mastery + paper progress signals
    const paperTopics = await prismaAny.paperTopic.findMany({
      where: { userId: user.id },
      select: {
        subject: true,
        paperCode: true,
        topicName: true,
        confidenceScore: true,
        sessionsLogged: true,
        needsRevision: true
      }
    })

    const studySessions = await prismaAny.studySession.findMany({
      where: { userId: user.id },
      select: {
        subject: true,
        paperCode: true,
        accuracy: true,
        obtainedMarks: true,
        totalMarks: true,
        deepFocusScore: true,
        date: true
      }
    })

    const activePlan = await prismaAny.revisionPlan.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { generatedAt: 'desc' }
    })

    const completedTasksBySubject = new Map<string, { total: number; done: number }>()
    if (activePlan) {
      const tasks = await prismaAny.dailyTask.findMany({
        where: { userId: user.id, planId: activePlan.id },
        select: { subject: true, completed: true }
      })
      for (const task of tasks) {
        if (!completedTasksBySubject.has(task.subject)) {
          completedTasksBySubject.set(task.subject, { total: 0, done: 0 })
        }
        const current = completedTasksBySubject.get(task.subject)!
        current.total += 1
        if (task.completed) current.done += 1
      }
    }

    const examSubjects = Array.from(new Set(examEntries.map((e) => e.subject)))

    const subjectProfiles: SubjectProfile[] = examSubjects.map((subjectCode) => {
      const entries = examEntries.filter((e) => e.subject === subjectCode)
      const subjectName = getSubjectNameFromCode(subjectCode, entries[0]?.subjectName)

      const papers = entries.map((e) => ({
        paperCode: e.paperCode,
        paperName: e.paperName,
        examDate: toIsoDateString(e.examDate),
        timeSlot: e.timeSlot
      }))

      const topics = paperTopics.filter((t: any) => t.subject === subjectCode)
      const sessions = studySessions.filter((s: any) => s.subject === subjectCode)

      const paperTopicsMap: Record<string, string[]> = {}
      for (const paper of papers) {
        paperTopicsMap[paper.paperCode] = topics.filter((t: any) => t.paperCode === paper.paperCode).map((t: any) => t.topicName)
      }

      const topicConfidenceAvg = topics.length > 0
        ? topics.reduce((sum: number, t: any) => sum + (t.confidenceScore || 0), 0) / topics.length
        : 0
      const topicMasteryPercent = topics.length > 0 ? (topicConfidenceAvg / 5) * 100 : 45

      const topicCoveragePercent = topics.length > 0
        ? (topics.filter((t: any) => (t.sessionsLogged || 0) > 0).length / topics.length) * 100
        : 40

      const sessionAccuracies = sessions
        .map((s: any) => {
          if (typeof s.accuracy === 'number') return s.accuracy
          if (typeof s.obtainedMarks === 'number' && typeof s.totalMarks === 'number' && s.totalMarks > 0) {
            return (s.obtainedMarks / s.totalMarks) * 100
          }
          return null
        })
        .filter((value: number | null): value is number => value !== null)

      const avgAccuracy = sessionAccuracies.length > 0
        ? sessionAccuracies.reduce((a: number, b: number) => a + b, 0) / sessionAccuracies.length
        : 55

      const completion = completedTasksBySubject.get(subjectCode)
      const completionPercent = completion && completion.total > 0 ? (completion.done / completion.total) * 100 : 50

      const expectedTarget = entries.length > 0
        ? (entries.reduce((sum, e) => sum + (e.targetScore ?? 95), 0) / entries.length)
        : 95

      const readiness = clampScore(
        avgAccuracy * 0.45 +
        topicMasteryPercent * 0.25 +
        topicCoveragePercent * 0.20 +
        completionPercent * 0.10
      )

      const strictness = readiness >= expectedTarget ? 'maintenance' : summarizeStrictness(readiness)

      return {
        subject: subjectCode,
        subjectName,
        readiness,
        strictness,
        papers,
        paperTopics: paperTopicsMap
      }
    })

    const studyHoursPerDay = body.studyHoursPerDay || activePlan?.studyHoursPerDay || 4

    const examsByDate = new Map<string, Array<{ subject: string; subjectName: string; paperCode: string; paperName: string; timeSlot: 'AM' | 'PM' }>>()
    for (const exam of examEntries) {
      const dateKey = toIsoDateString(exam.examDate)
      if (!examsByDate.has(dateKey)) examsByDate.set(dateKey, [])
      examsByDate.get(dateKey)?.push({
        subject: exam.subject,
        subjectName: getSubjectNameFromCode(exam.subject, exam.subjectName),
        paperCode: exam.paperCode,
        paperName: exam.paperName,
        timeSlot: exam.timeSlot
      })
    }

    const progressSummary = subjectProfiles
      .map((s) => {
        const nextPaper = [...s.papers].sort((a, b) => daysBetween(today, a.examDate) - daysBetween(today, b.examDate))[0]
        return `${s.subjectName} (${s.subject}) readiness=${s.readiness}/100 strictness=${s.strictness} next=${nextPaper?.paperCode || 'N/A'} D-${nextPaper ? daysBetween(today, nextPaper.examDate) : 'N/A'}`
      })
      .join('\n')

    const prompt = `You are an elite exam-phase planner. Build an adaptive EXAM MODE plan for a student with 16 papers.

TODAY: ${today}
FIRST EXAM: ${firstExamIso}
LAST EXAM: ${lastExamIso}
STUDY HOURS PER DAY: ${studyHoursPerDay}

PROGRESS SNAPSHOT BY SUBJECT:
${progressSummary}

RULES (HARD):
1) Return plan from TODAY to LAST EXAM, every day included.
2) Exactly 3 sessions daily: morning, afternoon, evening.
3) If a date has exams, put EXAM DAY rest session(s) for exam slots.
4) If a date has 2 exams, morning and afternoon must both be EXAM DAY rest for each paper.
5) Day before any exam = light review only (no heavy tasks).
6) Adapt difficulty using readiness:
   - strict => intense targeted correction and timed drills
   - balanced => mixed timed + correction
   - maintenance => concise high-yield maintenance
7) Tasks must be paper-wise and include paperCode.
8) If paper topics missing, use only: revision for this paper / do 1 timed paper / practice for this paper.

RETURN ONLY VALID JSON:
{
  "phases": [{"name":"exam","label":"Exam Mode","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","description":"string"}],
  "days": [
    {
      "date":"YYYY-MM-DD",
      "phase":"exam",
      "isExamDay":true,
      "sessions":[
        {"slot":"morning","subject":"string","subjectName":"string","task":"string","type":"revision|pastpaper|practice|rest"},
        {"slot":"afternoon","subject":"string","subjectName":"string","task":"string","type":"revision|pastpaper|practice|rest"},
        {"slot":"evening","subject":"string","subjectName":"string","task":"string","type":"revision|pastpaper|practice|rest"}
      ]
    }
  ]
}`

    let responseText = await callGroq(prompt, 6500)
    let rawPlanData: any

    try {
      rawPlanData = parseJsonResponse(responseText)
    } catch {
      const repairPrompt = `Fix this JSON and return only valid JSON with the same schema:\n${responseText}`
      try {
        responseText = await callGroq(repairPrompt, 6500)
        rawPlanData = parseJsonResponse(responseText)
      } catch {
        rawPlanData = null
      }
    }

    const normalized = normalizeExamModePlan(rawPlanData, today, lastExamIso, subjectProfiles, examsByDate)
    const strictSubjects = subjectProfiles.filter((s) => s.strictness === 'strict').map((s) => s.subject)

    const examPlanData = {
      ...normalized,
      meta: {
        mode: 'exam',
        activatedAt: new Date().toISOString(),
        daysUntilFirstExamAtActivation: daysUntilFirstExam,
        strictSubjects,
        subjectReadiness: subjectProfiles.map((s) => ({
          subject: s.subject,
          subjectName: s.subjectName,
          readiness: s.readiness,
          strictness: s.strictness
        }))
      }
    }

    await prismaAny.revisionPlan.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false }
    })

    const revisionPlan = await prismaAny.revisionPlan.create({
      data: {
        userId: user.id,
        firstExamDate: new Date(firstExamIso),
        lastExamDate: new Date(lastExamIso),
        studyHoursPerDay,
        isActive: true,
        planData: examPlanData
      }
    })

    let totalTasks = 0
    for (const day of examPlanData.days) {
      for (const sessionItem of day.sessions) {
        await prismaAny.dailyTask.create({
          data: {
            userId: user.id,
            planId: revisionPlan.id,
            date: new Date(`${day.date}T00:00:00Z`),
            sessionSlot: sessionItem.slot,
            subject: sessionItem.subject,
            subjectName: sessionItem.subjectName,
            taskDesc: sessionItem.task,
            taskType: sessionItem.type,
            phase: 'exam',
            completed: false
          }
        })
        totalTasks++
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'exam',
      planId: revisionPlan.id,
      totalDays: examPlanData.days.length,
      totalTasks,
      strictSubjects,
      subjectReadiness: examPlanData.meta.subjectReadiness
    })
  } catch (error) {
    console.error('Error activating exam mode:', error)
    return NextResponse.json({ error: 'Failed to activate exam mode' }, { status: 500 })
  }
}
