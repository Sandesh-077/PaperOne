'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface DashboardData {
  streaks: {
    unified: number
    study: number
    sat: number
    learning: number
  }
  upcomingExams: Array<{
    id: string
    name: string
    examDate: string
    daysRemaining: number
    subject?: { name: string }
  }>
  pendingRevisions: Array<{
    id: string
    scheduledFor: string
    sessionNumber: number
    topic: {
      name: string
      subject: { name: string }
    }
  }>
  activeLearningProjects: Array<{
    id: string
    name: string
    progressPercentage: number
    daysSpent: number
    currentUnit?: string
  }>
  upcomingReminders: Array<{
    id: string
    paperName: string
    reminderDate: string
    subject: { name: string }
  }>
  stats: {
    totalExams: number
    totalRevisionsDue: number
    activeProjects: number
  }
}

export default function EnhancedDashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activityCalendar, setActivityCalendar] = useState<Array<{ date: string; activities: string[] }>>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchDashboard()
    }
  }, [status, router])

  const fetchDashboard = async () => {
    try {
      const [dashResponse, calendarResponse] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/activity-calendar'),
      ])
      
      if (dashResponse.ok) {
        const data = await dashResponse.json()
        setDashboardData(data)
      }
      
      if (calendarResponse.ok) {
        const calData = await calendarResponse.json()
        setActivityCalendar(calData)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteRevision = async (revisionId: string) => {
    try {
      const response = await fetch(`/api/revisions/${revisionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      })
      if (response.ok) {
        fetchDashboard()
      }
    } catch (error) {
      console.error('Failed to complete revision:', error)
    }
  }

  if (loading || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const { streaks, upcomingExams, pendingRevisions, activeLearningProjects, upcomingReminders, stats } = dashboardData

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Your complete learning overview</p>
      </div>

      {/* Unified Streak */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">🔥 Unified Streak</p>
            <p className="text-5xl font-bold mt-2">{streaks.unified}</p>
            <p className="text-sm mt-1 opacity-90">days in a row</p>
          </div>
          <div className="text-right space-y-2">
            <div className="text-sm opacity-90">Study: <span className="font-bold">{streaks.study}</span></div>
            <div className="text-sm opacity-90">SAT: <span className="font-bold">{streaks.sat}</span></div>
            <div className="text-sm opacity-90">Learning: <span className="font-bold">{streaks.learning}</span></div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Upcoming Exams</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalExams}</p>
        </div>
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Revisions Due</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{stats.totalRevisionsDue}</p>
        </div>
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Active Projects</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{stats.activeProjects}</p>
        </div>
      </div>

      {/* Upcoming Exams */}
      {upcomingExams.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">📅 Upcoming Exams</h2>
            <Link href="/exams" className="text-sm text-blue-600 hover:text-blue-700">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingExams.map(exam => (
              <div key={exam.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{exam.name}</p>
                  {exam.subject && <p className="text-sm text-gray-600">{exam.subject.name}</p>}
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${exam.daysRemaining <= 7 ? 'text-red-600' : 'text-blue-600'}`}>
                    {exam.daysRemaining}
                  </p>
                  <p className="text-xs text-gray-600">days left</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Calendar */}
      {activityCalendar.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Activity Calendar</h2>
          <div className="grid grid-cols-7 gap-2">
            {activityCalendar.slice(0, 35).map((day) => {
              const date = new Date(day.date)
              const activityIcons: { [key: string]: string } = {
                sat: '📝',
                vocabulary: '📚',
                grammar: '✍️',
                essay: '📄',
                learning: '🚀',
                study: '📖',
                error: '❌',
              }
              
              return (
                <div
                  key={day.date}
                  className={`p-2 rounded-lg border ${
                    day.activities.length > 0
                      ? 'bg-green-50 border-green-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  title={day.activities.join(', ')}
                >
                  <div className="text-xs text-gray-600 text-center mb-1">
                    {date.getDate()}
                  </div>
                  <div className="flex flex-wrap justify-center gap-0.5">
                    {day.activities.slice(0, 3).map((activity, idx) => (
                      <span key={idx} className="text-xs">
                        {activityIcons[activity] || '•'}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
            <span>📝 SAT</span>
            <span>📚 Vocab</span>
            <span>✍️ Grammar</span>
            <span>📄 Essay</span>
            <span>🚀 Learning</span>
            <span>📖 Study</span>
          </div>
        </div>
      )}

      {/* Pending Revisions */}
      {pendingRevisions.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🔔 Revisions Due</h2>
          <div className="space-y-3">
            {pendingRevisions.map(revision => (
              <div key={revision.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{revision.topic.name}</p>
                  <p className="text-sm text-gray-600">{revision.topic.subject.name} • Session {revision.sessionNumber}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-orange-600 font-medium">
                    {new Date(revision.scheduledFor).toLocaleDateString()}
                  </div>
                  <button
                    onClick={() => handleCompleteRevision(revision.id)}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  >
                    ✓ Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Learning Projects */}
      {activeLearningProjects.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">📚 Active Learning</h2>
            <Link href="/learning" className="text-sm text-blue-600 hover:text-blue-700">
              View all →
            </Link>
          </div>
          <div className="space-y-4">
            {activeLearningProjects.map(project => (
              <div key={project.id} className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{project.name}</p>
                    {project.currentUnit && <p className="text-sm text-gray-600 mt-1">{project.currentUnit}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{project.progressPercentage}%</p>
                    <p className="text-xs text-gray-600">{project.daysSpent} days</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${project.progressPercentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Reminders */}
      {upcomingReminders.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">⏰ Practice Reminders</h2>
          <div className="space-y-3">
            {upcomingReminders.map(reminder => (
              <div key={reminder.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{reminder.paperName}</p>
                  <p className="text-sm text-gray-600">{reminder.subject.name}</p>
                </div>
                <div className="text-sm text-yellow-700 font-medium">
                  {new Date(reminder.reminderDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/subjects" className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:border-blue-600 transition-colors">
          <p className="text-lg font-semibold text-gray-900">📖 Subjects</p>
          <p className="text-sm text-gray-600 mt-1">Manage A-Level topics</p>
        </Link>
        <Link href="/sat" className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:border-blue-600 transition-colors">
          <p className="text-lg font-semibold text-gray-900">📝 SAT Prep</p>
          <p className="text-sm text-gray-600 mt-1">Study with videos</p>
        </Link>
        <Link href="/learning" className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:border-blue-600 transition-colors">
          <p className="text-lg font-semibold text-gray-900">🚀 New Skills</p>
          <p className="text-sm text-gray-600 mt-1">Track learning progress</p>
        </Link>
        <Link href="/exams" className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:border-blue-600 transition-colors">
          <p className="text-lg font-semibold text-gray-900">🎯 Exams</p>
          <p className="text-sm text-gray-600 mt-1">View countdowns</p>
        </Link>
      </div>
    </div>
  )
}
