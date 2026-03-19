'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface DailyTask {
  id: string
  date: string
  sessionSlot: string
  subject: string
  subjectName: string
  taskDesc: string
  completed: boolean
}

interface SubjectSessionInDay {
  subject: string
  subjectName: string
  topics: string[]
  activity: 'revision' | 'topical-past-paper' | 'full-paper'
  description?: string
}

interface SubjectWisePlanDay {
  date: string
  dayNumber: number
  phase: 'foundation' | 'blitz' | 'exam'
  isExamDay?: boolean
  examEntries?: Array<{ subject: string; subjectName: string; paperCode: string; examDate: string }>
  subjects: SubjectSessionInDay[]
}

interface RevisionPhase {
  name: string
  label: string
  startDate: string
  endDate: string
  description: string
}

interface SubjectWiseRevisionData {
  phases: RevisionPhase[]
  days: SubjectWisePlanDay[]
  formatVersion: 'subject-wise'
}

interface PomodoroSession {
  id: string
  subject: string | null
  topicName: string | null
  totalMinutes: number
}

interface WeekDay {
  date: string
  dayName: string
  tasks: DailyTask[]
}

interface ExamCountdown {
  subject: string
  subjectName: string
  paperName: string
  examDate: string
  daysUntil: number
}

interface PlanData {
  plan: {
    id: string
    generatedAt: string
    firstExamDate: string
    lastExamDate: string
    studyHoursPerDay: number
    mode?: 'regular' | 'exam'
  } | null
  planData?: SubjectWiseRevisionData // New subject-wise format
  todayTasks?: DailyTask[]
  weekTasks?: DailyTask[]
  stats: {
    totalTasks: number
    completedTasks: number
    completionPercent: number
  } | null
  nextExams: ExamCountdown[]
  examMode?: {
    ready: boolean
    active: boolean
    daysUntilFirstExam: number | null
  }
}

const SUBJECT_COLORS: Record<string, string> = {
  '9702': 'bg-blue-100 text-blue-700',
  '9701': 'bg-purple-100 text-purple-700',
  '9709': 'bg-green-100 text-green-700',
  '9618': 'bg-orange-100 text-orange-700',
  '8021': 'bg-pink-100 text-pink-700',
  'default': 'bg-gray-100 text-gray-700'
}

export default function PlannerPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [topicUpdating, setTopicUpdating] = useState<string | null>(null)
  const [activatingExamMode, setActivatingExamMode] = useState(false)
  const [regeneratingPlan, setRegeneratingPlan] = useState(false)
  const [generatingRecovery, setGeneratingRecovery] = useState(false)
  const [pomodoroStats, setPomodoroStats] = useState<{ totalMinutesThisWeek: number; recentSessions: PomodoroSession[] }>({ totalMinutesThisWeek: 0, recentSessions: [] })

  useEffect(() => {
    if (session) {
      fetchPlan()
      fetchPomodoroStats()
    }
  }, [session])

  const fetchPlan = async () => {
    try {
      // Try new subject-wise endpoint first
      let response = await fetch('/api/revision-plan/generate-subject-wise')
      let planData = null

      if (response.ok) {
        const subjectWiseData = await response.json()
        if (subjectWiseData.success && subjectWiseData.plan) {
          // Get all tasks (using a special flag to bypass date filter)
          const tasksResponse = await fetch('/api/daily-tasks?allTasks=true')
          const tasksData = tasksResponse.ok ? await tasksResponse.json() : { tasks: [] }
          const tasksMap = new Map()
          
          // Create a map of day-subject pairs to taskIds
          for (const task of tasksData.tasks || []) {
            const taskDate = new Date(task.date).toISOString().split('T')[0]
            const key = `${taskDate}-${task.subject}`
            tasksMap.set(key, task.id)
          }

          // Enhance plan data with taskIds
          const enhancedPlan = {
            ...subjectWiseData.plan,
            days: subjectWiseData.plan.days.map((day: any) => ({
              ...day,
              subjects: day.subjects.map((subject: any) => ({
                ...subject,
                taskId: tasksMap.get(`${day.date}-${subject.subject}`)
              }))
            }))
          }

          setData({
            plan: {
              id: '1',
              generatedAt: new Date().toISOString(),
              firstExamDate: subjectWiseData.firstExamDate,
              lastExamDate: subjectWiseData.lastExamDate,
              studyHoursPerDay: 5
            },
            planData: enhancedPlan,
            stats: null,
            nextExams: [],
            todayTasks: undefined,
            weekTasks: undefined
          })
          setLoading(false)
          return
        }
      }

      // Fall back to old endpoint
      response = await fetch('/api/revision-plan')
      if (response.ok) {
        planData = await response.json()
        setData(planData)
      }
    } catch (err) {
      console.error('Failed to fetch plan:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPomodoroStats = async () => {
    try {
      const response = await fetch('/api/pomodoro')
      if (response.ok) {
        const pomodoroData = await response.json()
        setPomodoroStats({
          totalMinutesThisWeek: pomodoroData.totalMinutesThisWeek || 0,
          recentSessions: (pomodoroData.sessions || []).slice(0, 3)
        })
      }
    } catch (err) {
      console.error('Failed to fetch pomodoro stats:', err)
    }
  }

  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    setTopicUpdating(taskId)
    try {
      const response = await fetch(`/api/daily-tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentCompleted })
      })
      if (response.ok) {
        // Refresh plan data
        await fetchPlan()
      }
    } catch (err) {
      console.error('Failed to update task:', err)
    } finally {
      setTopicUpdating(null)
    }
  }

  const handleToggleTopic = async (taskId: string, topicName: string, currentCompleted: boolean) => {
    setTopicUpdating(`${taskId}-${topicName}`)
    try {
      const response = await fetch(`/api/daily-tasks/${taskId}/topic-complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicName, completed: !currentCompleted })
      })
      if (response.ok) {
        // Refresh plan data
        await fetchPlan()
      }
    } catch (err) {
      console.error('Failed to update topic:', err)
    } finally {
      setTopicUpdating(null)
    }
  }

  const handleActivateExamMode = async () => {
    if (!data?.plan) return

    setActivatingExamMode(true)
    try {
      const response = await fetch('/api/revision-plan/exam-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyHoursPerDay: data.plan.studyHoursPerDay })
      })

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        alert(err?.error || 'Failed to activate Exam Mode')
        return
      }

      await fetchPlan()
    } catch (err) {
      console.error('Failed to activate exam mode:', err)
      alert('Failed to activate Exam Mode')
    } finally {
      setActivatingExamMode(false)
    }
  }

  const handleRegeneratePlan = async () => {
    setRegeneratingPlan(true)
    try {
      const response = await fetch('/api/revision-plan/generate-subject-wise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        alert(err?.error || 'Failed to regenerate plan')
        return
      }

      const result = await response.json()
      alert('✓ Subject-wise plan generated successfully!')
      await fetchPlan()
    } catch (err) {
      console.error('Failed to regenerate plan:', err)
      alert('Failed to regenerate plan')
    } finally {
      setRegeneratingPlan(false)
    }
  }

  const handleGenerateRecoveryPlan = async () => {
    setGeneratingRecovery(true)
    try {
      const response = await fetch('/api/revision-plan/generate-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        alert(err?.error || 'Failed to generate recovery plan')
        return
      }

      const result = await response.json()
      alert(`✓ Recovery plan generated!\n${result.message}`)
      await fetchPlan()
    } catch (err) {
      console.error('Failed to generate recovery plan:', err)
      alert('Failed to generate recovery plan')
    } finally {
      setGeneratingRecovery(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading your revision plan...</div>
      </div>
    )
  }

  if (!data?.plan) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daily Planner</h1>
          <p className="text-gray-600 mt-1">Your personalized study schedule</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-8 border border-blue-200 text-center">
          <p className="text-gray-700 mb-4">No revision plan found. Let’s create one!</p>
          <Link
            href="/planner/setup"
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
          >
            Set Up Your Plan
          </Link>
        </div>
      </div>
    )
  }

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const sessionColors = (slot: string) => {
    const lower = slot.toLowerCase()
    if (lower === 'morning') return 'bg-amber-50 border-l-4 border-amber-500'
    if (lower === 'afternoon') return 'bg-blue-50 border-l-4 border-blue-500'
    if (lower === 'evening') return 'bg-purple-50 border-l-4 border-purple-500'
    return 'bg-gray-50 border-l-4 border-gray-500'
  }

  const sessionLabel = (slot: string) => {
    const lower = slot.toLowerCase()
    if (lower === 'morning') return '🌅 Morning'
    if (lower === 'afternoon') return '☀️ Afternoon'
    if (lower === 'evening') return '🌙 Evening'
    return `📍 ${slot}`
  }

  // Group week tasks by date
  const weekDays: Record<string, DailyTask[]> = {}
  data.weekTasks.forEach((task) => {
    const date = task.date.split('T')[0]
    if (!weekDays[date]) weekDays[date] = []
    weekDays[date].push(task)
  })

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today_date = new Date()
  const firstDay = new Date(today_date)
  firstDay.setDate(firstDay.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Daily Planner</h1>
        <p className="text-gray-600 mt-1">Your personalized study schedule</p>
      </div>

      {/* Regenerate Plan Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleGenerateRecoveryPlan}
          disabled={generatingRecovery}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-medium rounded-lg transition text-sm"
          title="Generate a recovery plan if you've missed topics"
        >
          {generatingRecovery ? 'Generating...' : '🎯 Generate Recovery Plan'}
        </button>
        <button
          onClick={handleRegeneratePlan}
          disabled={regeneratingPlan}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg transition text-sm"
        >
          {regeneratingPlan ? 'Regenerating...' : '🔄 Regenerate Subject-Wise Plan'}
        </button>
      </div>

      {data.examMode?.ready && !data.examMode?.active && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-red-700 font-semibold">🚨 Exam Mode Ready</p>
            <p className="text-sm text-red-700 mt-1">
              You are in the final exam window ({data.examMode.daysUntilFirstExam ?? 0} day(s) to first exam). Activate adaptive Exam Mode now.
            </p>
          </div>
          <button
            onClick={handleActivateExamMode}
            disabled={activatingExamMode}
            className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-lg transition"
          >
            {activatingExamMode ? 'Activating...' : 'Activate Exam Mode'}
          </button>
        </div>
      )}

      {data.examMode?.active && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-emerald-700 font-semibold">✅ Exam Mode Active</p>
          <p className="text-sm text-emerald-700 mt-1">Plan is now adapted for paper-wise exam execution and progress-based intensity.</p>
        </div>
      )}

      {/* Next Exam Countdowns */}
      {data.nextExams.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">⏰ Next Exams</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.nextExams.slice(0, 3).map((exam, idx) => (
              <div key={idx} className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-5 text-white shadow-md">
                <p className="text-sm opacity-90">{exam.subjectName}</p>
                <p className="text-xs opacity-75 mt-1">{exam.paperName}</p>
                <div className="mt-3">
                  <p className="text-4xl font-bold">{exam.daysUntil}</p>
                  <p className="text-xs opacity-90">days until exam</p>
                </div>
                <p className="text-xs opacity-75 mt-2">📅 {new Date(exam.examDate).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Focus Timer Widget */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg p-6 text-white shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">🍅 Focus Timer</h2>
            <p className="text-sm opacity-90 mt-1">{pomodoroStats.totalMinutesThisWeek} hours focused this week</p>
          </div>
          <button
            onClick={() => window.open('/timer', '_blank')}
            className="px-4 py-2 bg-white text-orange-600 font-semibold rounded-lg hover:bg-gray-100 transition text-sm"
          >
            Start Focus Session
          </button>
        </div>
        {pomodoroStats.recentSessions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white border-opacity-30">
            <p className="text-xs opacity-75 mb-2">Last 3 sessions:</p>
            <div className="space-y-1">
              {pomodoroStats.recentSessions.map((session) => (
                <div key={session.id} className="text-sm opacity-90 flex justify-between">
                  <span>
                    {session.subject || 'Study'} {session.topicName ? `· ${session.topicName}` : ''}
                  </span>
                  <span className="opacity-75">{session.totalMinutes} min</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Subject-Wise Plan Display (New Format) */}
      {data.planData?.formatVersion === 'subject-wise' && data.planData?.days && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">📖 40-Day Revision Plan</h2>

          {/* Plan Phases Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {data.planData.phases.map((phase) => (
              <div key={phase.name} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                <h3 className="font-semibold text-gray-900">{phase.label}</h3>
                <p className="text-xs text-gray-600 mt-1">{phase.description}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {phase.startDate} → {phase.endDate}
                </p>
              </div>
            ))}
          </div>

          {/* Daily Plans */}
          <div className="space-y-4">
            {data.planData.days.map((day) => {
              const dayDate = new Date(day.date)
              const dayName = dayDate.toLocaleDateString('en-GB', { weekday: 'short' })
              const isToday = day.date === new Date().toISOString().split('T')[0]
              const phaseBg = day.phase === 'foundation' ? 'bg-blue-50' : day.phase === 'blitz' ? 'bg-amber-50' : 'bg-red-50'
              const phaseBorder = day.phase === 'foundation' ? 'border-blue-200' : day.phase === 'blitz' ? 'border-amber-200' : 'border-red-200'

              return (
                <div
                  key={day.date}
                  className={`rounded-lg border-2 p-4 transition ${
                    isToday ? 'border-blue-500 bg-blue-50 shadow-md' : `${phaseBorder} ${phaseBg}`
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        Day {day.dayNumber} · {dayName} {isToday ? '(TODAY)' : day.date}
                      </h3>
                      <span className="text-xs font-medium px-2 py-1 rounded-full inline-block mt-1 bg-white border border-gray-300">
                        {day.phase === 'foundation' ? '📚 Foundation' : day.phase === 'blitz' ? '⚡ Blitz' : '📝 Exam Practice'}
                      </span>
                      {day.isExamDay && day.examEntries && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full ml-2 inline-block bg-red-200 text-red-800">
                          🚨 EXAM DAY: {day.examEntries.map(e => `${e.paperCode}`).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subjects for the Day */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {day.subjects.map((subject, idx) => (
                      <div
                        key={`${day.date}-${subject.subject}`}
                        className={`rounded-lg p-4 border-l-4 ${SUBJECT_COLORS[subject.subject] || SUBJECT_COLORS.default}`}
                      >
                        {/* Subjects for the Day */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">{subject.subjectName}</h4>
                            {(subject as any).paperCodes && (subject as any).paperCodes.length > 0 && (
                              <p className="text-xs text-gray-600 mt-1">
                                {(subject as any).paperCodes.join(', ')}
                              </p>
                            )}
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${
                            subject.activity === 'revision'
                              ? 'bg-blue-100 text-blue-700'
                              : subject.activity === 'topical-past-paper'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {subject.activity === 'revision'
                              ? '📖 Revision'
                              : subject.activity === 'topical-past-paper'
                              ? '📋 Topical Past Papers'
                              : '📝 Full Paper'}
                          </span>
                        </div>

                        {/* Topics with Checkboxes */}
                        {Array.isArray(subject.topics) && subject.topics.length > 0 ? (
                          <div className="space-y-2">
                            {subject.topics.map((topic, tidx) => {
                              const topicName = typeof topic === 'string' ? topic : (topic as any)?.name || topic
                              const paperName = typeof topic === 'object' ? (topic as any)?.paperName : ''
                              const isCompleted = typeof topic === 'object' ? (topic as any)?.completed || false : false
                              const pastPaperStarted = typeof topic === 'object' ? (topic as any)?.pastPaperStarted || false : false
                              const reRevisionDone = typeof topic === 'object' ? (topic as any)?.reRevisionDone || false : false
                              const isSyncing = topicUpdating === `${(subject as any).taskId}-${topicName}`
                              
                              return (
                                <div key={tidx} className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={isCompleted}
                                    onChange={() => {
                                      if ((subject as any).taskId) {
                                        handleToggleTopic((subject as any).taskId, topicName, isCompleted)
                                      }
                                    }}
                                    disabled={isSyncing}
                                    className="mt-1 w-4 h-4 cursor-pointer flex-shrink-0 disabled:opacity-60"
                                  />
                                  <div className="flex-1">
                                    <span className={`text-sm py-1 block ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                      {topicName}{paperName ? ` (${paperName})` : ''}
                                    </span>
                                    {/* Show past paper and re-revision status if topic is completed */}
                                    {isCompleted && (
                                      <div className="flex gap-2 mt-1">
                                        {pastPaperStarted && (
                                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">✓ Past Paper Started</span>
                                        )}
                                        {reRevisionDone && (
                                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ Re-Revised</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 italic">No specific topics assigned</p>
                        )}

                        {subject.description && (
                          <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-200">
                            {subject.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Today's Sessions - Only show if OLD format */}
      {!data.planData && data.todayTasks && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">📚 Today's Sessions</h2>
          <p className="text-sm text-gray-600 mb-4">{today}</p>
          
          {data.todayTasks.length === 0 ? (
            <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 text-center">
              <p className="text-gray-500">No tasks scheduled for today. Well done! 🎉</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.todayTasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-lg p-5 shadow-sm border border-gray-200 transition ${
                  task.completed ? 'bg-gray-50 opacity-60' : 'bg-white hover:shadow-md'
                } ${sessionColors(task.sessionSlot)}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task.id, task.completed)}
                    disabled={updatingTaskId === task.id}
                    className="mt-1 w-5 h-5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{sessionLabel(task.sessionSlot)}</p>
                    <div className="mt-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${SUBJECT_COLORS[task.subject] || SUBJECT_COLORS.default}`}>
                        {task.subjectName}
                      </span>
                    </div>
                    <p className={`text-sm mt-3 ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {task.taskDesc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Overview - Only show if OLD format */}
      {!data.planData && data.weekTasks && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">📅 This Week</h2>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 overflow-x-auto">
          <div className="grid grid-cols-7 gap-3 min-w-full">
            {dayNames.map((day, idx) => {
              const date = new Date(firstDay)
              date.setDate(date.getDate() + idx)
              const dateStr = date.toISOString().split('T')[0]
              const dayTasks = weekDays[dateStr] || []
              const isToday = dateStr === new Date().toISOString().split('T')[0]

              return (
                <div
                  key={day}
                  className={`p-4 rounded-lg border-2 ${
                    isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <p className="font-semibold text-gray-900">{day}</p>
                  <p className="text-sm text-gray-600">{date.getDate()}</p>
                  <div className="mt-3 space-y-2">
                    {dayTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`w-3 h-3 rounded-full ${
                          SUBJECT_COLORS[task.subject] || SUBJECT_COLORS.default
                        }`}
                        title={task.subjectName}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Progress Stats */}
      {data.stats && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">📊 Overall Progress</h2>
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-5xl font-bold text-blue-600">{data.stats.completionPercent}%</div>
                <p className="text-gray-600 mt-1">Plan Completion</p>
              </div>
              <div className="flex-1">
                <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all"
                    style={{ width: `${data.stats.completionPercent}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {data.stats.completedTasks} of {data.stats.totalTasks} tasks completed
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
