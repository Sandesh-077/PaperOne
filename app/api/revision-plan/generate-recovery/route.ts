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

const PRIMARY_SUBJECTS = ['9701', '9702', '9709']
const SECONDARY_SUBJECTS = ['9618', '8021']

function toIsoDateString(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 })

    const prismaAny = prisma as any

    // Get current active plan
    const currentPlan = await prismaAny.revisionPlan.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { generatedAt: 'desc' }
    })

    if (!currentPlan) {
      return new Response(JSON.stringify({ error: 'No active plan found' }), { status: 404 })
    }

    // Get all tasks for this plan
    const allTasks = await prismaAny.dailyTask.findMany({
      where: { planId: currentPlan.id },
      orderBy: [{ date: 'asc' }, { subject: 'asc' }]
    })

    // Analyze missed topics
    const missedTopics: Record<string, string[]> = {} // subject -> [topicName]
    const completedTopics: Record<string, string[]> = {} // subject -> [topicName]

    for (const task of allTasks) {
      if (!missedTopics[task.subject]) missedTopics[task.subject] = []
      if (!completedTopics[task.subject]) completedTopics[task.subject] = []

      const topics = (task.topics || []) as Array<{ name: string; completed?: boolean }>
      for (const topic of topics) {
        if (topic.completed) {
          completedTopics[task.subject].push(topic.name)
        } else {
          if (!missedTopics[task.subject].includes(topic.name)) {
            missedTopics[task.subject].push(topic.name)
          }
        }
      }
    }

    // Calculate days until first exam
    const currentPlanData = currentPlan.planData as SubjectWiseRevisionData
    const firstExamDate = new Date(currentPlan.firstExamDate)
    const today = new Date()
    const daysUntilExam = Math.ceil((firstExamDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Only allow recovery if there's time and missed topics exist
    const hasMissedTopics = Object.values(missedTopics).some(topics => topics.length > 0)
    if (daysUntilExam <= 7 || !hasMissedTopics) {
      return new Response(JSON.stringify({
        error: hasMissedTopics 
          ? 'Only 7 days until first exam - not enough time to create recovery plan'
          : 'No missed topics detected - current plan is on track',
        missedTopics,
        completedTopics,
        daysUntilExam
      }), { status: 409 })
    }

    // Build recovery plan with Groq
    const recoveryPrompt = buildRecoveryPrompt(
      toIsoDateString(today),
      toIsoDateString(firstExamDate),
      missedTopics,
      completedTopics,
      daysUntilExam,
      currentPlanData
    )

    const response = await callGroq(recoveryPrompt, 1500)

    const recoveryData = parseJsonResponse(response)

    // Create new recovery plan or update existing with missed topics prioritized
    const recoveryPlan: SubjectWiseRevisionData = {
      phases: currentPlanData.phases,
      days: generateRecoveryDays(
        today,
        firstExamDate,
        missedTopics,
        completedTopics,
        daysUntilExam
      ),
      formatVersion: 'subject-wise'
    }

    // Update revision plan as recovery mode
    const updatedPlan = await prismaAny.revisionPlan.update({
      where: { id: currentPlan.id },
      data: {
        planData: recoveryPlan as any,
        isActive: true
      }
    })

    // Clear and regenerate daily tasks
    await prismaAny.dailyTask.deleteMany({ where: { planId: currentPlan.id } })

    for (const day of recoveryPlan.days) {
      for (const subject of day.subjects) {
        const topicsJson = subject.topics.map((t: any) => ({
          name: typeof t === 'string' ? t : t.name,
          paperCode: typeof t === 'string' ? '' : (t.paperCode || ''),
          completed: false,
          completedAt: null
        }))

        await prismaAny.dailyTask.create({
          data: {
            userId: user.id,
            planId: currentPlan.id,
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

    return new Response(JSON.stringify({
      success: true,
      recoveryPlan: recoveryPlan,
      missedTopics,
      completedTopics,
      daysUntilExam,
      message: `Recovery plan generated! ${Object.values(missedTopics).flat().length} missed topics will be prioritized.`
    }), { headers: { 'Content-Type': 'application/json' } })
  } catch (error: any) {
    console.error('Error generating recovery plan:', error)
    return new Response(JSON.stringify({ error: error.message || 'Recovery plan generation failed' }), { status: 500 })
  }
}

function buildRecoveryPrompt(
  today: string,
  firstExamDate: string,
  missedTopics: Record<string, string[]>,
  completedTopics: Record<string, string[]>,
  daysUntilExam: number,
  currentPlan: SubjectWiseRevisionData
): string {
  const missedTopicsList = Object.entries(missedTopics)
    .map(([subject, topics]) => `${subject}: ${topics.join(', ')}`)
    .join('\n')

  return `You are a Cambridge A-Level exam preparation expert. Generate a RECOVERY study plan.

CURRENT STATUS (as of ${today}):
- Days until first exam: ${daysUntilExam}
- Missed/Incomplete topics:
${missedTopicsList}

TASK: Create a focused recovery plan that:
1. Prioritizes missed topics in the next ${Math.min(daysUntilExam - 5, 7)} days
2. Maintains subject rotation (Physics/Chemistry/Maths + Secondary when applicable)
3. Allocates time proportionally to how many topics are missed per subject
4. Reserves last 3 days for full past paper practice
5. Focuses on high-marking topics first

RULES:
- Generate EXACTLY ${Math.min(daysUntilExam - 2, 10)} days of recovery schedule
- Each day has 3-4 subjects (follow alternation pattern)
- Phase: all days are "blitz" or "exam" (no foundation)
- Activity types: "topical-past-paper" for missed topics, "full-paper" for last 3 days
- High-marking topics get more frequent appearance

Return ONLY valid JSON matching this structure:
{
  "recoveryMessage": "Brief explanation of the recovery strategy",
  "days": [
    {
      "dayNumber": 1,
      "date": "2026-03-20",
      "phase": "blitz",
      "subjects": [
        {
          "subject": "9701",
          "subjectName": "Physics",
          "topics": ["Missed Topic 1", "Missed Topic 2"],
          "activity": "topical-past-paper",
          "description": "Focus on..."
        }
      ]
    }
  ]
}`
}

function generateRecoveryDays(
  today: Date,
  firstExamDate: Date,
  missedTopics: Record<string, string[]>,
  completedTopics: Record<string, string[]>,
  daysUntilExam: number
): SubjectWisePlanDay[] {
  const days: SubjectWisePlanDay[] = []
  const recoveryDays = Math.min(daysUntilExam - 2, 10)
  const lastThreeDays = Math.max(3, Math.ceil(daysUntilExam * 0.15))

  // Track which missed topics we've scheduled
  const scheduledMissed: Record<string, string[]> = {}
  for (const subject in missedTopics) {
    scheduledMissed[subject] = []
  }

  const subjects = ['9701', '9702', '9709', '9618', '8021']
  const primarySubjects = subjects.filter(s => PRIMARY_SUBJECTS.includes(s))
  const secondarySubjects = subjects.filter(s => SECONDARY_SUBJECTS.includes(s))

  for (let i = 0; i < recoveryDays; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const dayNum = i + 1

    // Determine if this is an exam day (last 3 days)
    const isExamDay = dayNum > recoveryDays - lastThreeDays
    const phase = isExamDay ? 'exam' : 'blitz'
    const activity = isExamDay ? 'full-paper' : 'topical-past-paper'

    // Alternate subjects
    const isOddDay = dayNum % 2 === 1
    const subjectsForDay = isOddDay 
      ? primarySubjects.slice(0, 3)
      : [...primarySubjects.slice(0, 3), ...(secondarySubjects.length > 0 ? [secondarySubjects[0]] : [])]

    const daySubjects: SubjectSessionInDay[] = subjectsForDay.map(subjectCode => {
      const missed = missedTopics[subjectCode] || []
      const scheduled = scheduledMissed[subjectCode] || []

      // Get next unscheduled missed topics
      const topicsToAdd = missed
        .filter(t => !scheduled.includes(t))
        .slice(0, isExamDay ? 1 : 2)

      // Update scheduled
      scheduledMissed[subjectCode].push(...topicsToAdd)

      // Fallback to completed topics if no missed topics
      const topics = topicsToAdd.length > 0 ? topicsToAdd : (completedTopics[subjectCode] || []).slice(0, 2)

      return {
        subject: subjectCode,
        subjectName: SUBJECT_CODE_MAP[subjectCode] || subjectCode,
        topics: topics.length > 0 ? topics : ['Comprehensive Review'],
        activity,
        description: `${SUBJECT_CODE_MAP[subjectCode]}: ${isExamDay ? 'Full past paper' : 'Recovery focus on'} ${topics.slice(0, 2).join(', ')}`
      }
    })

    days.push({
      date: toIsoDateString(date),
      dayNumber: dayNum,
      phase,
      subjects: daySubjects
    })
  }

  return days
}
