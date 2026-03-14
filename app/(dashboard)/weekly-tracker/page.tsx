'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const SUBJECTS = [
  { code: '9701', name: 'Chemistry' },
  { code: '9702', name: 'Physics' },
  { code: '9709', name: 'Mathematics' },
  { code: '9618', name: 'Computer Science' },
  { code: '8021', name: 'English GP' }
]

interface WeeklyPerformanceData {
  id: string
  subject: string
  weekStartDate: string
  weekEndDate: string
  weeklyRating: number
  gradeLabel: string
  deltaPreviousWeek: number
  studyHoursScore: number
  accuracyScore: number
  focusScore: number
  papersScore: number
  distractionScore: number
  reflection?: string
  nextWeekGoal?: string
  biggestWin?: string
}

interface MonthSummaryData {
  subject: string
  totalStudyHours: number
  totalPapers: number
  averageAccuracy: number
  bestWeekRating: number
  worstWeekRating: number
  week4MinusWeek1: number
  monthGrade: string
}

export default function WeeklyTrackerPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [weeksData, setWeeksData] = useState<WeeklyPerformanceData[]>([])
  const [monthData, setMonthData] = useState<MonthSummaryData[]>([])
  const [loading, setLoading] = useState(true)
  const [editingFields, setEditingFields] = useState<{[key: string]: string}>({})

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') {
      initializeWeekSelector()
    }
  }, [status, router])

  const initializeWeekSelector = () => {
    const today = new Date()
    const weeks = []
    for (let i = 0; i < 12; i++) {
      const startDate = new Date(today)
      startDate.setDate(today.getDate() - today.getDay() - (i * 7))
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      weeks.push({
        label: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        value: startDate.toISOString().split('T')[0]
      })
    }
    setSelectedWeek(weeks[0].value)
    setWeeksData([])
  }

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'Elite': return 'bg-green-100 text-green-900'
      case 'Strong': return 'bg-lime-100 text-lime-900'
      case 'Building': return 'bg-yellow-100 text-yellow-900'
      case 'Weak': return 'bg-orange-100 text-orange-900'
      case 'Lock In': return 'bg-red-100 text-red-900'
      default: return 'bg-gray-100 text-gray-900'
    }
  }

  const getDeltaColor = (delta: number): string => {
    return delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-600'
  }

  if (status === 'loading' || loading) {
    return <div className="p-6">Loading...</div>
  }

  const weeks = []
  for (let i = 0; i < 12; i++) {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - startDate.getDay() - (i * 7))
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    weeks.push({
      label: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      value: startDate.toISOString().split('T')[0]
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Weekly Tracker</h1>
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white"
        >
          {weeks.map(week => (
            <option key={week.value} value={week.value}>{week.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {SUBJECTS.map(subject => (
          <div key={subject.code} className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <h3 className="font-semibold text-sm mb-3">{subject.name}</h3>
            <div className={`rounded p-3 mb-3 text-center ${getGradeColor('Building')}`}>
              <div className="text-2xl font-bold">0</div>
              <div className="text-xs">Rating</div>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Study Hours</span>
                <span className="font-semibold">0/25</span>
              </div>
              <div className="flex justify-between">
                <span>Accuracy</span>
                <span className="font-semibold">0/30</span>
              </div>
              <div className="flex justify-between">
                <span>Focus</span>
                <span className="font-semibold">0/20</span>
              </div>
              <div className="flex justify-between">
                <span>Papers</span>
                <span className="font-semibold">0/15</span>
              </div>
              <div className="flex justify-between">
                <span>Distractions</span>
                <span className="font-semibold">0/10</span>
              </div>
            </div>
            <div className={`text-center font-bold text-sm mt-2 ${getDeltaColor(0)}`}>
              ↗ 0%
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold">Week Reflection</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Reflection</label>
            <textarea
              placeholder="What went well? What can improve?"
              defaultValue={editingFields['reflection'] || ''}
              onChange={(e) => setEditingFields({...editingFields, reflection: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg resize-none h-24"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Next Week&apos;s Goal</label>
            <textarea
              placeholder="What&apos;s your focus for next week?"
              defaultValue={editingFields['goal'] || ''}
              onChange={(e) => setEditingFields({...editingFields, goal: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg resize-none h-24"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Biggest Win</label>
            <textarea
              placeholder="What accomplishment are you most proud of?"
              defaultValue={editingFields['win'] || ''}
              onChange={(e) => setEditingFields({...editingFields, win: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg resize-none h-24"
            />
          </div>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Save Reflection
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Month Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Subject</th>
                <th className="px-4 py-2 text-right">Study Hours</th>
                <th className="px-4 py-2 text-right">Papers</th>
                <th className="px-4 py-2 text-right">Avg Accuracy</th>
                <th className="px-4 py-2 text-right">Best Week</th>
                <th className="px-4 py-2 text-right">Worst Week</th>
                <th className="px-4 py-2 text-right">Trend</th>
                <th className="px-4 py-2 text-center">Grade</th>
              </tr>
            </thead>
            <tbody>
              {SUBJECTS.map(subject => (
                <tr key={subject.code} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{subject.name}</td>
                  <td className="px-4 py-2 text-right">0h</td>
                  <td className="px-4 py-2 text-right">0</td>
                  <td className="px-4 py-2 text-right">0%</td>
                  <td className="px-4 py-2 text-right">0</td>
                  <td className="px-4 py-2 text-right">0</td>
                  <td className="px-4 py-2 text-right text-gray-600">-</td>
                  <td className={`px-4 py-2 text-center font-semibold rounded ${getGradeColor('Building')}`}>
                    Building
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
