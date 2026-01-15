'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Stats {
  grammar: { total: number; understood: number; needsWork: number }
  vocabulary: { total: number; learned: number; thisWeek: number }
  essays: { total: number; wordCountTrend: Array<{ date: string; wordCount: number }> }
  errors: { total: number; unresolved: number }
  streak: { current: number; longest: number; totalDays: number; daysMissed: number }
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchStats()
    }
  }, [status, router])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const logStudySession = async () => {
    try {
      await fetch('/api/study-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities: ['general'], duration: 0 })
      })
      fetchStats()
    } catch (error) {
      console.error('Failed to log session:', error)
    }
  }

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your EGP exam preparation progress</p>
        </div>
        <button
          onClick={logStudySession}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Log Today&apos;s Session
        </button>
      </div>

      {/* Study Consistency */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Current Streak</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.streak.current}</p>
          <p className="text-sm text-gray-500 mt-1">days in a row</p>
        </div>
        
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Longest Streak</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.streak.longest}</p>
          <p className="text-sm text-gray-500 mt-1">personal best</p>
        </div>
        
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">Total Study Days</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stats.streak.totalDays}</p>
          <p className="text-sm text-gray-500 mt-1">{stats.streak.daysMissed} missed</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Grammar Rules"
          value={stats.grammar.total}
          subtitle={`${stats.grammar.understood} understood`}
          href="/grammar"
        />
        <StatCard
          title="Vocabulary"
          value={stats.vocabulary.total}
          subtitle={`${stats.vocabulary.thisWeek} this week`}
          href="/vocabulary"
        />
        <StatCard
          title="Essays Written"
          value={stats.essays.total}
          subtitle="Total essays"
          href="/essays"
        />
        <StatCard
          title="Errors"
          value={stats.errors.unresolved}
          subtitle="To review"
          href="/errors"
        />
      </div>

      {/* Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Grammar Progress</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Understood</span>
              <span className="font-medium text-green-600">{stats.grammar.understood}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all"
                style={{ width: `${stats.grammar.total > 0 ? (stats.grammar.understood / stats.grammar.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Needs Work</span>
              <span className="font-medium text-orange-600">{stats.grammar.needsWork}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Vocabulary Progress</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Words</span>
              <span className="font-medium text-gray-900">{stats.vocabulary.total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Learned</span>
              <span className="font-medium text-green-600">{stats.vocabulary.learned}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all"
                style={{ width: `${stats.vocabulary.total > 0 ? (stats.vocabulary.learned / stats.vocabulary.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Added This Week</span>
              <span className="font-medium text-blue-600">+{stats.vocabulary.thisWeek}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Word Count Trend */}
      {stats.essays.wordCountTrend.length > 0 && (
        <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Essay Word Count Progress</h3>
          <div className="space-y-2">
            {stats.essays.wordCountTrend.slice(-5).map((essay, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="text-sm text-gray-500 w-24">
                  {new Date(essay.date).toLocaleDateString()}
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div
                    className="bg-purple-600 h-6 rounded-full flex items-center justify-end pr-3 transition-all"
                    style={{ width: `${Math.min((essay.wordCount / 1000) * 100, 100)}%` }}
                  >
                    <span className="text-xs text-white font-medium">{essay.wordCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-4">Showing last 5 essays</p>
        </div>
      )}

      {/* Study Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Study Tips</h3>
        <ul className="text-gray-700 text-sm space-y-2">
          <li>• Practice writing essays daily to improve fluency</li>
          <li>• Review your error log weekly to avoid repeating mistakes</li>
          <li>• Master grammar rules consistently for steady progress</li>
          <li>• Use new vocabulary in sentences to reinforce learning</li>
        </ul>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, href }: {
  title: string
  value: number
  subtitle: string
  href: string
}) {
  return (
    <a href={href} className="block bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </a>
  )
}
