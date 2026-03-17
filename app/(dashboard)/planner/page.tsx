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
  } | null
  todayTasks: DailyTask[]
  weekTasks: DailyTask[]
  stats: {
    totalTasks: number
    completedTasks: number
    completionPercent: number
  } | null
  nextExams: ExamCountdown[]
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
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [pomodoroStats, setPomodoroStats] = useState<{ totalMinutesThisWeek: number; recentSessions: PomodoroSession[] }>({ totalMinutesThisWeek: 0, recentSessions: [] })

  useEffect(() => {
    if (session) {
      fetchPlan()
      fetchPomodoroStats()
    }
  }, [session])

  const fetchPlan = async () => {
    try {
      const response = await fetch('/api/revision-plan')
      if (response.ok) {
        const planData = await response.json()
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
    setUpdatingTaskId(taskId)
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
      setUpdatingTaskId(null)
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

      {/* Today's Sessions */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">📚 Today’s Sessions</h2>
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

      {/* Weekly Overview */}
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
