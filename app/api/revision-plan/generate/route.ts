import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Groq } from 'groq-sdk'
import type { SubjectContext, RevisionPlanData } from '@/types/planner'

export const dynamic = 'force-dynamic'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

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

    // STEP 4: Group by subject and build SubjectContext
    const subjectMap = new Map<string, any>()

    for (const entry of examEntries) {
      if (!subjectMap.has(entry.subject)) {
        subjectMap.set(entry.subject, {
          subject: entry.subject,
          subjectName: entry.subjectName,
          papers: [],
          previousScore: entry.previousScore,
          targetScore: entry.targetScore
        })
      }

      const subjectContext = subjectMap.get(entry.subject)
      subjectContext.papers.push({
        paperCode: entry.paperCode,
        paperName: entry.paperName,
        examDate: entry.examDate.toISOString().split('T')[0], // YYYY-MM-DD
        timeSlot: entry.timeSlot
      })
    }

    // Calculate gapSize and convert to array
    const subjects: SubjectContext[] = Array.from(subjectMap.values()).map((subj: any) => ({
      ...subj,
      gapSize: (subj.targetScore || 0) - (subj.previousScore || 0)
    }))

    // Sort by gapSize descending (highest gap first = most urgent)
    subjects.sort((a, b) => (b.gapSize || 0) - (a.gapSize || 0))

    // STEP 5: Build AI prompt
    const today = new Date().toISOString().split('T')[0]
    const lastExamDate = examEntries[examEntries.length - 1].examDate.toISOString().split('T')[0]
    const firstExamDate = examEntries[0].examDate.toISOString().split('T')[0]

    const subjectDetails = subjects
      .map(
        (subj) =>
          `Subject: ${subj.subjectName} (${subj.subject})
Papers: ${subj.papers.map((p: any) => `${p.paperCode} (${p.paperName}) on ${p.examDate} ${p.timeSlot}`).join(', ')}
Previous Score: ${subj.previousScore || 'N/A'}, Target: ${subj.targetScore || 'N/A'}, Gap: ${subj.gapSize || 0}`
      )
      .join('\n\n')

    const prompt = `You are a study planner for A-Level exam preparation. Create a detailed revision plan.

TODAY: ${today}
LAST EXAM: ${lastExamDate}
STUDY HOURS PER DAY: ${studyHoursPerDay}

SUBJECTS:
${subjectDetails}

INSTRUCTIONS:
1. Divide the plan into 3 phases:
   - Foundation (first 40% of days): Topic revision and concept mastery
   - Blitz (middle 35% of days): Timed past papers and practice
   - Exam (last 25% of days): Targeting weak spots and final review

2. Each day has exactly 3 sessions: morning, afternoon, evening
3. Each session has: slot (morning/afternoon/evening), subject, subjectName, task (specific action), type (revision/pastpaper/practice/rest)
4. The day before any exam should be light review only
5. On exam days, the morning session should be "EXAM DAY" with type "rest"
6. Subjects with larger score gaps (higher priority) should get more study sessions per week
7. Tasks must be SPECIFIC and ACTIONABLE: e.g., "Do Chemistry 9702/21 Nov 2023 timed 1.5 hrs", "Complete Mechanics Chapter 2 practice problems", NOT vague like "Study chemistry"
8. Include EVERY day from ${today} to ${lastExamDate}

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
    const message = await groq.chat.completions.create({
      model: 'mixtral-8x7b-32768',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    // Extract text response
    const responseText = message.choices[0].message.content || ''

    // Strip markdown code fences
    let jsonString = responseText
      .replace(/^```json\n?/, '')
      .replace(/\n?```$/, '')
      .replace(/^```\n?/, '')
      .trim()

    // Parse JSON
    let planData: RevisionPlanData
    try {
      planData = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      console.error('Response text:', responseText)
      return NextResponse.json(
        { error: 'AI returned invalid JSON. Please try again.' },
        { status: 500 }
      )
    }

    // STEP 7: Save to database
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

    // STEP 8: Return response
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
