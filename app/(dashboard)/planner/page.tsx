'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface ExamCountdown {
  subject: string
  subjectName: string
  paperName: string
  examDate: string
  daysUntil: number
}

interface PomodoroSession {
  id: string
  subject: string | null
  topicName: string | null
  totalMinutes: number
}

interface DailyTask {
  id: string
  date: string
  subject: string
  subjectName: string
  topicName?: string
  activity?: string
  taskDesc: string
  completed: boolean
}

interface Subject {
  code: string
  name: string
  papers: Array<{ code: string; name: string; topics: string[] }>
}

const SUBJECT_COLORS: Record<string, string> = {
  '9702': 'bg-blue-100 text-blue-700',
  '9701': 'bg-purple-100 text-purple-700',
  '9709': 'bg-green-100 text-green-700',
  '9618': 'bg-orange-100 text-orange-700',
  '8021': 'bg-pink-100 text-pink-700',
  'default': 'bg-gray-100 text-gray-700'
}

// Mock subjects data - would come from API in production
const MOCK_SUBJECTS: Subject[] = [
  {
    code: '9702',
    name: 'Chemistry',
    papers: [
      { code: '9702/21', name: 'Paper 2.1', topics: ['Atomic Structure', 'Bonding', 'Thermodynamics', 'Kinetics', 'Equilibrium'] },
      { code: '9702/22', name: 'Paper 2.2', topics: ['Atomic Structure', 'Bonding', 'Thermodynamics', 'Kinetics', 'Equilibrium'] }
    ]
  },
  {
    code: '9701',
    name: 'Physics',
    papers: [
      { code: '9701/21', name: 'Paper 2.1', topics: ['Mechanics', 'Waves', 'Thermodynamics', 'Fields'] },
      { code: '9701/22', name: 'Paper 2.2', topics: ['Mechanics', 'Waves', 'Thermodynamics', 'Fields'] }
    ]
  },
  {
    code: '9709',
    name: 'Biology',
    papers: [
      { code: '9709/21', name: 'Paper 2.1', topics: ['Cell Biology', 'Genetics', 'Evolution', 'Ecology'] },
      { code: '9709/22', name: 'Paper 2.2', topics: ['Cell Biology', 'Genetics', 'Evolution', 'Ecology'] }
    ]
  }
]

// Manual Daily Planner Component
export default function PlannerPage() {
  const { data: session } = useSession()
  const [examData, setExamData] = useState<{ nextExams: ExamCountdown[] }>({ nextExams: [] })
  const [pomodoroStats, setPomodoroStats] = useState<{ totalMinutesThisWeek: number; recentSessions: PomodoroSession[] }>({ totalMinutesThisWeek: 0, recentSessions: [] })
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedSubjectForPlan, setSelectedSubjectForPlan] = useState<Subject | null>(null)
  const [selectedPaper, setSelectedPaper] = useState<string | null>(null)
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [activityType, setActivityType] = useState<'revision' | 'topical' | 'practice-questions' | 'full-paper'>('revision')
  const [submittingPlan, setSubmittingPlan] = useState(false)

  useEffect(() => {
    if (session) {
      fetchExams()
      fetchPomodoroStats()
      fetchTasks()
    }
  }, [session])

  const fetchExams = async () => {
    try {
      const response = await fetch('/api/exam-entries')
      if (response.ok) {
        const exams = await response.json()
        const nextExams = exams
          .map((exam: any) => ({
            subject: exam.subject,
            subjectName: exam.subjectName,
            paperName: exam.paperName,
            examDate: exam.examDate,
            daysUntil: Math.ceil((new Date(exam.examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          }))
          .filter((exam: ExamCountdown) => exam.daysUntil > -1)
          .sort((a: ExamCountdown, b: ExamCountdown) => a.daysUntil - b.daysUntil)
          .slice(0, 3)
        setExamData({ nextExams })
      }
    } catch (err) {
      console.error('Failed to fetch exams:', err)
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

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/daily-tasks?allTasks=true')
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
    }
  }

  const handleAddPlan = async () => {
    if (!selectedSubjectForPlan || (!selectedTopics.length && activityType !== 'full-paper')) {
      alert('Please select subject and at least one topic')
      return
    }

    setSubmittingPlan(true)
    try {
      const taskDesc = activityType === 'full-paper' 
        ? `${selectedPaper} - Full Past Paper` 
        : `${selectedTopics.join(', ')} - ${activityType.replace('-', ' ')}`

      const response = await fetch('/api/daily-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          subject: selectedSubjectForPlan.code,
          subjectName: selectedSubjectForPlan.name,
          topicName: activityType === 'full-paper' ? selectedPaper : selectedTopics[0],
          activity: activityType,
          taskDesc,
          taskType: activityType === 'revision' ? 'Revision' : 'PastPaper'
        })
      })

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        alert(err?.error || 'Failed to create plan')
        return
      }

      alert('✓ Plan added successfully!')
      await fetchTasks()
      resetPlanForm()
      setShowPlanModal(false)
    } catch (err) {
      console.error('Failed to add plan:', err)
      alert('Failed to add plan')
    } finally {
      setSubmittingPlan(false)
    }
  }

  const resetPlanForm = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
    setSelectedSubjectForPlan(null)
    setSelectedPaper(null)
    setSelectedTopics([])
    setActivityType('revision')
  }

  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    try {
      const response = await fetch(`/api/daily-tasks/${taskId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentCompleted })
      })
      if (response.ok) {
        await fetchTasks()
      }
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete this plan?')) return
    try {
      const response = await fetch(`/api/daily-tasks/${taskId}`, { method: 'DELETE' })
      if (response.ok) {
        await fetchTasks()
      }
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  const getTodayTasks = () => {
    const today = new Date().toISOString().split('T')[0]
    return tasks.filter(t => t.date.split('T')[0] === today)
  }

  const getUpcomingTasks = () => {
    const today = new Date().toISOString().split('T')[0]
    return tasks.filter(t => t.date.split('T')[0] > today).slice(0, 7)
  }

  const dateToLocalString = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading planner...</div>
      </div>
    )
  }

  const todayTasks = getTodayTasks()
  const upcomingTasks = getUpcomingTasks()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daily Planner</h1>
          <p className="text-gray-600 mt-1">Create your personalized study schedule</p>
        </div>
        <button
          onClick={() => setShowPlanModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition shadow-md"
        >
          + Add Plan
        </button>
      </div>

      {/* Next Exam Countdowns */}
      {examData.nextExams.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">⏰ Next Exams</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {examData.nextExams.map((exam, idx) => (
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
            <p className="text-sm opacity-90 mt-1">{pomodoroStats.totalMinutesThisWeek} minutes focused this week</p>
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

      {/* Today's Plan */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">📚 Today&apos;s Plan</h2>
        {todayTasks.length === 0 ? (
          <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500 text-lg">No plans for today yet</p>
            <p className="text-sm text-gray-400 mt-1">Click &quot;Add Plan&quot; to create your first study session</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayTasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-lg p-5 border-l-4 border-blue-500 shadow-sm transition ${
                  task.completed ? 'bg-gray-50 opacity-70' : 'bg-white hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task.id, task.completed)}
                    className="mt-1 w-5 h-5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${SUBJECT_COLORS[task.subject] || SUBJECT_COLORS.default}`}>
                      {task.subjectName}
                    </span>
                    <p className={`text-sm font-semibold mt-2 ${task.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {task.taskDesc}
                    </p>
                    {task.activity && (
                      <p className="text-xs text-gray-500 mt-1">Type: {task.activity.replace('-', ' ')}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-gray-400 hover:text-red-500 transition text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Plans */}
      {upcomingTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">📅 Upcoming Plans</h2>
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-lg p-4 bg-white border border-gray-200 flex items-start justify-between transition hover:shadow-md ${
                  task.completed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task.id, task.completed)}
                    className="mt-1 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">{dateToLocalString(task.date)}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${SUBJECT_COLORS[task.subject] || SUBJECT_COLORS.default}`}>
                        {task.subjectName}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {task.taskDesc}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-gray-300 hover:text-red-500 transition text-sm ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white flex items-center justify-between">
              <h2 className="text-2xl font-bold">Create Study Plan</h2>
              <button
                onClick={() => {
                  setShowPlanModal(false)
                  resetPlanForm()
                }}
                className="text-white hover:bg-white hover:bg-opacity-20 w-8 h-8 rounded-full flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Date Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Select Date</label>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      selectedDate === new Date().toISOString().split('T')[0]
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      const tomorrow = new Date()
                      tomorrow.setDate(tomorrow.getDate() + 1)
                      setSelectedDate(tomorrow.toISOString().split('T')[0])
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      selectedDate === new Date(Date.now() + 86400000).toISOString().split('T')[0]
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Tomorrow
                  </button>
                </div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">{dateToLocalString(selectedDate)}</p>
              </div>

              {/* Subject Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Select Subject</label>
                <div className="grid grid-cols-2 gap-3">
                  {MOCK_SUBJECTS.map((subject) => (
                    <button
                      key={subject.code}
                      onClick={() => {
                        setSelectedSubjectForPlan(subject)
                        setSelectedPaper(null)
                        setSelectedTopics([])
                      }}
                      className={`p-3 rounded-lg border-2 font-medium transition ${
                        selectedSubjectForPlan?.code === subject.code
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {subject.name} ({subject.code})
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Type - Show before paper/topics for full-paper */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Activity Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'revision', label: '📖 Revision' },
                    { value: 'topical', label: '📋 Topical Past Papers' },
                    { value: 'practice-questions', label: '❓ Practice Questions' },
                    { value: 'full-paper', label: '📝 Full Past Paper' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setActivityType(type.value as 'revision' | 'topical' | 'practice-questions' | 'full-paper')
                        if (type.value !== 'full-paper') setSelectedTopics([])
                      }}
                      className={`p-3 rounded-lg border-2 font-medium transition text-sm ${
                        activityType === type.value
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Selection - For Full Paper or Topics */}
              {selectedSubjectForPlan && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Select Paper {activityType === 'full-paper' ? '(Final)' : ''}
                  </label>
                  <div className="space-y-2">
                    {selectedSubjectForPlan.papers.map((paper) => (
                      <button
                        key={paper.code}
                        onClick={() => {
                          setSelectedPaper(paper.code)
                          if (activityType !== 'full-paper') setSelectedTopics([])
                        }}
                        className={`w-full p-3 rounded-lg border-2 font-medium transition text-left ${
                          selectedPaper === paper.code
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300'
                        }`}
                      >
                        <span className="font-semibold">{paper.code}</span> - {paper.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Topic Selection - Hide for full-paper */}
              {selectedSubjectForPlan && selectedPaper && activityType !== 'full-paper' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">Select Topics</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedSubjectForPlan.papers
                      .find((p) => p.code === selectedPaper)
                      ?.topics.map((topic) => (
                        <label key={topic} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTopics.includes(topic)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTopics([...selectedTopics, topic])
                              } else {
                                setSelectedTopics(selectedTopics.filter((t) => t !== topic))
                              }
                            }}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className="text-gray-700">{topic}</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowPlanModal(false)
                    resetPlanForm()
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPlan}
                  disabled={!selectedSubjectForPlan || submittingPlan}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-60 text-white font-semibold rounded-lg transition"
                >
                  {submittingPlan ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
