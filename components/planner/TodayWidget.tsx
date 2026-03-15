'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

interface DailyTask {
  id: string
  sessionSlot: string
  subject: string
  subjectName: string
  taskDesc: string
  completed: boolean
}

interface NextExam {
  id: string
  subject: string
  subjectName: string
  daysUntil: number
}

interface PlanData {
  plan: any | null
  todayTasks: DailyTask[]
  nextExams: NextExam[]
  stats: any | null
}

const SESSION_COLORS: Record<string, { border: string; bg: string; label: string; emoji: string }> = {
  morning: { border: 'border-l-amber-400', bg: 'bg-amber-50', label: '🌅 Morning', emoji: '🌅' },
  afternoon: { border: 'border-l-blue-400', bg: 'bg-blue-50', label: '☀️ Afternoon', emoji: '☀️' },
  evening: { border: 'border-l-purple-400', bg: 'bg-purple-50', label: '🌙 Evening', emoji: '🌙' },
}

const SUBJECT_COLORS: Record<string, string> = {
  '9702': 'bg-blue-100 text-blue-700',
  '9701': 'bg-purple-100 text-purple-700',
  '9706': 'bg-green-100 text-green-700',
  '9705': 'bg-red-100 text-red-700',
  '9704': 'bg-orange-100 text-orange-700',
  '9703': 'bg-pink-100 text-pink-700',
}

export function TodayWidget() {
  const { status } = useSession()
  const [planData, setPlanData] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPlanData()
    }
  }, [status])

  const fetchPlanData = async () => {
    try {
      const response = await fetch('/api/revision-plan')
      if (response.ok) {
        const data = await response.json()
        setPlanData(data)
      }
    } catch (error) {
      console.error('Failed to fetch plan data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTaskComplete = async (taskId: string, currentCompleted: boolean) => {
    setUpdatingTaskId(taskId)
    try {
      const response = await fetch(`/api/daily-tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentCompleted }),
      })
      if (response.ok) {
        // Refetch plan data to update
        await fetchPlanData()
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    } finally {
      setUpdatingTaskId(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!planData?.plan || planData.todayTasks.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="text-center">
          <p className="text-gray-600 mb-3">No plan yet</p>
          <Link href="/planner/setup" className="text-sm text-blue-600 hover:text-blue-700">
            Create your plan →
          </Link>
        </div>
      </div>
    )
  }

  const { todayTasks, nextExams } = planData
  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const nextExam = nextExams?.[0]

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Today's Plan</h2>
          <p className="text-sm text-gray-600">{formattedDate}</p>
        </div>
      </div>

      {/* Next Exam */}
      {nextExam && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Next exam:</span> {nextExam.subjectName} in <span className="font-bold">{nextExam.daysUntil}</span> days
          </p>
        </div>
      )}

      {/* Tasks */}
      <div className="space-y-2">
        {todayTasks.map((task) => {
          const config = SESSION_COLORS[task.sessionSlot] || SESSION_COLORS.morning
          return (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${config.border} ${config.bg}`}
            >
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleTaskComplete(task.id, task.completed)}
                disabled={updatingTaskId === task.id}
                className="mt-1 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-700">{SESSION_COLORS[task.sessionSlot]?.label || task.sessionSlot}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${SUBJECT_COLORS[task.subject] || 'bg-gray-100 text-gray-700'}`}>
                    {task.subjectName}
                  </span>
                </div>
                <p className={`text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                  {task.taskDesc}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* View Full Plan Link */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <Link href="/planner" className="text-sm text-blue-600 hover:text-blue-700">
          View full plan →
        </Link>
      </div>
    </div>
  )
}
