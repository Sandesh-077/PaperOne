'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface EnglishProfile {
  grammarLevel: number
  vocabLevel: number
  writingLevel: number
  overallScore: number
  gpReadiness: number
  satReadiness: number
  ieltsEstimate: number
  uniReadiness: number
  totalSessions: number
  streak: number
  lastActiveDate: string | null
}

interface TrainerSession {
  id: string
  sessionType: string
  topic: string
  grammarRule?: string
  vocabWords?: any[]
  questionAsked?: string
  userResponse?: string
  aiFeedback?: any
  grammarScoreDelta?: number
  vocabScoreDelta?: number
  writingScoreDelta?: number
  essayContent?: string
  cambridgeLevel?: number
  marksEstimate?: number
  createdAt: string
}

interface ProfileData {
  profile: EnglishProfile
  sessions: TrainerSession[]
  learnedGrammarCount: number
  learnedVocabCount: number
}

export default function EnglishProgressPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<any[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status, router])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/english-trainer/profile')
      if (response.ok) {
        const data = await response.json()
        setProfileData(data)
        
        // Prepare chart data from last 14 sessions
        const last14 = data.sessions.slice(0, 14).reverse();
        const chartData = last14.map((session: any) => {
          const scoreDelta = (session.grammarScoreDelta || 0) + (session.vocabScoreDelta || 0) + (session.writingScoreDelta || 0);
          return {
            date: new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            score: Math.max(0, scoreDelta),
            fullDate: new Date(session.createdAt).toISOString().split('T')[0]
          };
        });
        setChartData(chartData);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading progress...</div>
      </div>
    )
  }

  if (!profileData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Failed to load progress data</div>
      </div>
    )
  }

  const { profile, sessions, learnedGrammarCount, learnedVocabCount } = profileData

  // Calculate readiness percentage and what's needed
  const examDate = new Date('2026-04-27')
  const today = new Date()
  const daysUntilExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  // Calculate level color coding
  const getLevelColor = (level: number, max: number) => {
    const percentage = (level / max) * 100
    if (percentage <= 30) return 'bg-red-500'
    if (percentage <= 60) return 'bg-amber-500'
    return 'bg-green-500'
  }

  const getWritingLevelLabel = (level: number) => {
    const labels = ['', 'Developing', 'Emerging', 'Proficient', 'Advanced', 'Outstanding']
    return labels[Math.min(level, 5)] || 'N/A'
  }

  // Calculate suggestions
  const suggestions = []
  if (profile.grammarLevel < profile.vocabLevel - 1) {
    suggestions.push('Focus on grammar — it\'s your weakest area right now. Today\'s trainer will prioritise grammar rules.')
  }
  if (profile.writingLevel < 3 && profile.gpReadiness < 50) {
    suggestions.push('Your writing level needs the most work before the GP exam. Try writing at least one full essay this week.')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">English Progress</h1>
        <p className="text-gray-600 mt-1">Track your Cambridge English journey</p>
      </div>

      {/* SECTION 1: Level Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Grammar Level */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Grammar Level</p>
          <p className="text-4xl font-bold text-gray-900 mb-4">{profile.grammarLevel}/10</p>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${getLevelColor(profile.grammarLevel, 10)} transition-all`}
              style={{ width: `${(profile.grammarLevel / 10) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {profile.grammarLevel <= 3 ? 'Developing' : profile.grammarLevel <= 6 ? 'Improving' : 'Strong'}
          </p>
        </div>

        {/* Vocab Level */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Vocabulary Level</p>
          <p className="text-4xl font-bold text-gray-900 mb-4">{profile.vocabLevel}/10</p>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${getLevelColor(profile.vocabLevel, 10)} transition-all`}
              style={{ width: `${(profile.vocabLevel / 10) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {profile.vocabLevel <= 3 ? 'Developing' : profile.vocabLevel <= 6 ? 'Improving' : 'Strong'}
          </p>
        </div>

        {/* Writing Level */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Writing Level</p>
          <p className="text-4xl font-bold text-blue-600 mb-4">{profile.writingLevel}/5</p>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full ${getLevelColor(profile.writingLevel, 5)} transition-all`}
              style={{ width: `${(profile.writingLevel / 5) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2 font-semibold">
            Level {profile.writingLevel}: {getWritingLevelLabel(profile.writingLevel)}
          </p>
        </div>

        {/* Overall Score */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 shadow-sm border border-blue-200">
          <p className="text-sm text-gray-600 mb-2">Overall Score</p>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  strokeDasharray={`${(profile.overallScore / 100) * 283} 283`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-2xl font-bold text-gray-900">{profile.overallScore}</p>
                <p className="text-xs text-gray-500">/100</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            {profile.overallScore >= 80 ? 'Excellent' : profile.overallScore >= 60 ? 'Good' : 'Keep working'}
          </p>
        </div>
      </div>

      {/* SECTION 2: Goal Readiness Bars */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Goal Readiness</h2>
        
        {/* Cambridge GP 8021 */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-900">Cambridge GP 8021 (Target: Grade A)</label>
            <span className="text-xs text-gray-600">{daysUntilExam > 0 ? `27 Apr 2026 · ${daysUntilExam} days` : 'Exam Today!'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
              style={{ width: `${profile.gpReadiness}%` }}
            ></div>
          </div>
          <p className="text-lg font-bold text-gray-900">{Math.round(profile.gpReadiness)}%</p>
        </div>

        {/* SAT Writing */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-900">SAT Writing (Target: 750+)</label>
            <span className="text-xs text-gray-600">{profile.satReadiness >= 100 ? '✓ Target met' : `${100 - Math.round(profile.satReadiness)} points needed`}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
              style={{ width: `${Math.min(profile.satReadiness, 100)}%` }}
            ></div>
          </div>
          <p className="text-lg font-bold text-gray-900">{Math.round(profile.satReadiness)}%</p>
        </div>

        {/* IELTS */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-900">IELTS (Target: 7.0 Band)</label>
            <span className="text-xs text-gray-600">Estimated {(profile.ieltsEstimate / 10).toFixed(1)}/10 band</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all"
              style={{ width: `${Math.min((profile.ieltsEstimate / 10) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-lg font-bold text-gray-900">{(profile.ieltsEstimate / 10).toFixed(1)} band</p>
        </div>

        {/* University Essay Readiness */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-gray-900">University Essay Readiness</label>
            <span className="text-xs text-gray-600">{profile.uniReadiness >= 80 ? 'Strong' : profile.uniReadiness >= 50 ? 'On track' : 'Needs work'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
              style={{ width: `${profile.uniReadiness}%` }}
            ></div>
          </div>
          <p className="text-lg font-bold text-gray-900">{Math.round(profile.uniReadiness)}%</p>
        </div>
      </div>

      {/* SECTION 3: Activity Chart */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Session Activity (Last 14 Days)</h2>
        
        {chartData.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-end justify-between h-64 gap-2 px-2 py-4 border-l-2 border-b-2 border-gray-300">
              {chartData.map((data: any, idx: number) => {
                const maxScore = Math.max(...chartData.map((d: any) => d.score), 1)
                const heightPercent = (data.score / maxScore) * 100
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600" style={{ height: `${Math.max(heightPercent, 5)}%` }}></div>
                    <p className="text-xs text-gray-600 text-center">{data.date}</p>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <p className="text-gray-500 font-semibold mb-2">No sessions yet</p>
              <p className="text-sm text-gray-400 mb-4">Start your training to see activity here</p>
              <Link href="/english-trainer" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold">
                Start Learning
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: Learned Items Counter */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 shadow-sm border border-green-200">
          <p className="text-4xl font-bold text-green-600 mb-2">{learnedGrammarCount}</p>
          <p className="text-sm text-gray-700 font-semibold">grammar rules learned</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-6 shadow-sm border border-blue-200">
          <p className="text-4xl font-bold text-blue-600 mb-2">{learnedVocabCount}</p>
          <p className="text-sm text-gray-700 font-semibold">vocabulary words learned</p>
        </div>
      </div>
      <p className="text-xs text-gray-600 text-center bg-gray-50 rounded-lg p-3">
        Keep going — Cambridge examiners reward a wide range of vocabulary and language features.
      </p>

      {/* SECTION 5: Streak and Recent Activity */}
      <div className="space-y-4">
        {/* Streak Badge */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🔥</span>
            <div>
              <p className="text-lg font-bold">
                {profile.streak > 0 ? `${profile.streak} day streak` : 'Start your streak today!'}
              </p>
              {profile.streak > 0 && (
                <p className="text-sm opacity-90">Keep it up! Last active {
                  profile.lastActiveDate ? new Date(profile.lastActiveDate).toLocaleDateString() : 'today'
                }</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent 5 Sessions */}
        {sessions.length > 0 ? (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Sessions</h3>
            <div className="space-y-3">
              {sessions.slice(0, 5).map((session) => {
                const levelDelta = (session.grammarScoreDelta || 0) + (session.vocabScoreDelta || 0) + (session.writingScoreDelta || 0);
                return (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(session.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          session.sessionType === 'learn' ? 'bg-blue-100 text-blue-700' :
                          session.sessionType === 'practice' ? 'bg-green-100 text-green-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {session.sessionType.charAt(0).toUpperCase() + session.sessionType.slice(1)}
                        </span>
                        <p className="text-xs text-gray-600">{session.topic || session.grammarRule || 'Writing'}</p>
                      </div>
                    </div>
                    {levelDelta !== 0 && (
                      <div className={`text-sm font-bold ${levelDelta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {levelDelta > 0 ? '+' : ''}{levelDelta}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {/* SECTION 6: What to Work on Next */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-6 shadow-sm border border-amber-200">
        <h2 className="text-lg font-bold text-gray-900 mb-4">What to Work on Next</h2>
        {suggestions.length > 0 ? (
          <div className="space-y-3 mb-4">
            {suggestions.map((suggestion, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-amber-600 mt-1">→</span>
                <p className="text-sm text-gray-700">{suggestion}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-700 mb-4">{`You're doing great! Keep practicing to reach your goals.`}</p>
        )}
        <Link 
          href="/english-trainer" 
          className="inline-block bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition font-semibold"
        >
          Next trainer session →
        </Link>
      </div>
    </div>
  )
}
