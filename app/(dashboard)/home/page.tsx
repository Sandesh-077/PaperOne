'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface DashboardData {
  streaks: {
    current: number
    daysActive: number
  }
  thisWeek: {
    totalHours: number
    pastPapers: number
    sessionsCompleted: number
  }
  topicsNeedingRevision: Array<{
    id: string
    subject: string
    topic: string
    confidenceScore?: number
  }>
  recentSessions: Array<{
    date: string
    subject: string
    topic: string
    hours: number
  }>
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
      } else {
        setDashboardData({
          streaks: { current: 0, daysActive: 0 },
          thisWeek: { totalHours: 0, pastPapers: 0, sessionsCompleted: 0 },
          topicsNeedingRevision: [],
          recentSessions: []
        })
      }
      
      if (calendarResponse.ok) {
        const calData = await calendarResponse.json()
        setActivityCalendar(calData)
      } else {
        setActivityCalendar([])
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error)
      setDashboardData({
        streaks: { current: 0, daysActive: 0 },
        thisWeek: { totalHours: 0, pastPapers: 0, sessionsCompleted: 0 },
        topicsNeedingRevision: [],
        recentSessions: []
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Failed to load dashboard</div>
      </div>
    )
  }

  const { streaks, thisWeek, topicsNeedingRevision, recentSessions } = dashboardData

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Your learning overview</p>
      </div>

      {/* Streak Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90">🔥 Current Streak</p>
            <p className="text-5xl font-bold mt-2">{streaks.current}</p>
            <p className="text-sm mt-1 opacity-90">days in a row</p>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">Days Active: <span className="font-bold text-lg">{streaks.daysActive}</span></div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Hours This Week</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{thisWeek.totalHours.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-2">hours</p>
        </div>
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Past Papers</p>
          <p className="text-3xl font-bold text-orange-600 mt-1">{thisWeek.pastPapers}</p>
          <p className="text-xs text-gray-500 mt-2">this week</p>
        </div>
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Sessions</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{thisWeek.sessionsCompleted}</p>
          <p className="text-xs text-gray-500 mt-2">completed</p>
        </div>
      </div>

      {/* Topics Needing Revision */}
      {topicsNeedingRevision.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📚 Topics Needing Revision</h2>
          <div className="space-y-3">
            {topicsNeedingRevision.map((topic) => (
              <div key={topic.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="font-semibold text-gray-900">{topic.topic}</p>
                  <p className="text-sm text-gray-600">{topic.subject}</p>
                </div>
                {topic.confidenceScore && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{topic.confidenceScore}%</p>
                    <p className="text-xs text-gray-600">confidence</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <Link href="/topic-mastery" className="text-sm text-blue-600 hover:text-blue-700 mt-4 inline-block">
            View all topics →
          </Link>
        </div>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📝 Recent Sessions</h2>
          <div className="space-y-3">
            {recentSessions.map((session, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="font-semibold text-gray-900">{session.topic}</p>
                  <p className="text-sm text-gray-600">{session.subject} • {session.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">{session.hours}h</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/session-log" className="text-sm text-blue-600 hover:text-blue-700 mt-4 inline-block">
            View all sessions →
          </Link>
        </div>
      )}

      {/* Empty State */}
      {recentSessions.length === 0 && topicsNeedingRevision.length === 0 && (
        <div className="bg-blue-50 rounded-lg p-8 text-center border border-blue-200">
          <p className="text-gray-600 mb-4">No study sessions yet. Start a session to see your progress here!</p>
          <Link href="/session-log" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Log a Session
          </Link>
        </div>
      )}
    </div>
  )
}
