'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface ExamEntry {
  id: string
  subject: string
  subjectName: string
  paperCode: string
  paperName: string
  examDate: string
  timeSlot: 'AM' | 'PM'
  previousScore?: number
  targetScore?: number
  color?: string
}

export default function PlannerSetupPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [exams, setExams] = useState<ExamEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string>('')
  const [studyHours, setStudyHours] = useState(4)

  const [formData, setFormData] = useState({
    subject: '',
    subjectName: '',
    paperCode: '',
    paperName: '',
    examDate: '',
    timeSlot: 'AM' as 'AM' | 'PM',
    previousScore: '',
    targetScore: ''
  })

  const [topicsData, setTopicsData] = useState({
    selectedSubject: '',
    selectedPaper: '',
    topicsText: ''
  })

  // Fetch exams on mount
  useEffect(() => {
    if (session) {
      fetchExams()
    }
  }, [session])

  const fetchExams = async () => {
    try {
      const response = await fetch('/api/exam-entries')
      if (response.ok) {
        const data = await response.json()
        setExams(data.entries || [])
      }
    } catch (err) {
      console.error('Failed to fetch exams:', err)
    }
  }

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/exam-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.subject,
          subjectName: formData.subjectName,
          paperCode: formData.paperCode,
          paperName: formData.paperName,
          examDate: formData.examDate,
          timeSlot: formData.timeSlot,
          previousScore: formData.previousScore ? parseFloat(formData.previousScore) : undefined,
          targetScore: formData.targetScore ? parseFloat(formData.targetScore) : undefined
        })
      })

      if (response.ok) {
        // Seed topics for this paper (THING 2)
        try {
          await fetch('/api/paper-topics/seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: formData.subject,
              subjectName: formData.subjectName,
              paperCode: formData.paperCode,
              paperName: formData.paperName
            })
          })
        } catch (seedErr) {
          console.log('Topics seeding skipped:', seedErr)
        }

        // Refresh exams list
        await fetchExams()
        // Reset form
        setFormData({
          subject: '',
          subjectName: '',
          paperCode: '',
          paperName: '',
          examDate: '',
          timeSlot: 'AM',
          previousScore: '',
          targetScore: ''
        })
      } else {
        setError('Failed to add exam')
      }
    } catch (err) {
      setError('Error adding exam')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteExam = async (id: string) => {
    try {
      const response = await fetch(`/api/exam-entries/${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setExams(exams.filter(e => e.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete exam:', err)
    }
  }

  const handleAddTopics = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topicsData.selectedSubject || !topicsData.selectedPaper || !topicsData.topicsText.trim()) {
      setError('Please select subject, paper, and enter topics')
      return
    }

    setError('')
    setLoading(true)
    try {
      const topicsList = topicsData.topicsText
        .split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      // Create topics one by one
      for (const topicName of topicsList) {
        await fetch('/api/paper-topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: topicsData.selectedSubject,
            subjectName: exams.find(e => e.subject === topicsData.selectedSubject)?.subjectName || '',
            paperCode: topicsData.selectedPaper,
            paperName: exams.find(e => e.paperCode === topicsData.selectedPaper)?.paperName || '',
            topicName: topicName,
            topicOrder: topicsList.indexOf(topicName),
            source: 'manual'
          })
        })
      }

      // Reset form
      setTopicsData({ selectedSubject: '', selectedPaper: '', topicsText: '' })
    } catch (err) {
      setError('Error adding topics')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Get unique subjects with their papers
  const subjectCodes = [...new Set(exams.map(e => e.subject))]
  const papersBySubject = (subject: string) => {
    return exams.filter(e => e.subject === subject)
  }

  const handleGeneratePlan = async () => {
    if (exams.length === 0) {
      setError('Please add at least one exam first')
      return
    }

    setGenerating(true)
    setError('')

    try {
      const response = await fetch('/api/revision-plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studyHoursPerDay: studyHours })
      })

      if (response.ok) {
        router.push('/planner')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to generate plan')
      }
    } catch (err) {
      setError('Error generating plan')
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Exam Planner Setup</h1>
        <p className="text-gray-600 mt-1">Add your exams and generate your personalized revision plan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Exam Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 sticky top-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📝 Add Exam</h2>
            
            <form onSubmit={handleAddExam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject Code</label>
                <input
                  type="text"
                  placeholder="e.g., 9702"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g., Chemistry"
                  value={formData.subjectName}
                  onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Paper Code</label>
                <input
                  type="text"
                  placeholder="e.g., 9702/21"
                  value={formData.paperCode}
                  onChange={(e) => setFormData({ ...formData, paperCode: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Paper Name</label>
                <input
                  type="text"
                  placeholder="e.g., May 2023 – Paper 1"
                  value={formData.paperName}
                  onChange={(e) => setFormData({ ...formData, paperName: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Exam Date</label>
                <input
                  type="date"
                  value={formData.examDate}
                  onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Time Slot</label>
                <select
                  value={formData.timeSlot}
                  onChange={(e) => setFormData({ ...formData, timeSlot: e.target.value as 'AM' | 'PM' })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="AM">🌅 AM</option>
                  <option value="PM">🌅 PM</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Previous Score %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Optional"
                  value={formData.previousScore}
                  onChange={(e) => setFormData({ ...formData, previousScore: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Target Score %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Optional"
                  value={formData.targetScore}
                  onChange={(e) => setFormData({ ...formData, targetScore: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Exam'}
              </button>
            </form>
          </div>
        </div>

        {/* Exams List */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📅 Your Exams</h2>
          
          {exams.length === 0 ? (
            <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 text-center">
              <p className="text-gray-500">No exams added yet. Add your first exam to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exams
                .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
                .map((exam) => (
                  <div key={exam.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{exam.subjectName}</h3>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{exam.timeSlot}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{exam.paperCode} • {exam.paperName}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        📆 {new Date(exam.examDate).toLocaleDateString('en-GB', { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                      {(exam.previousScore || exam.targetScore) && (
                        <p className="text-xs text-gray-600 mt-2">
                          {exam.previousScore}% → {exam.targetScore}%
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteExam(exam.id)}
                      className="ml-4 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
                    >
                      Delete
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Topics Management Section */}
      {exams.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">📚 Manage Topics</h2>
          <p className="text-gray-600 mb-4">Add topics for each subject and paper (optional - helps with study planning)</p>

          {/* Subject Cards */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            {subjectCodes.map(subject => {
              const subjectExams = papersBySubject(subject)
              const subjectName = subjectExams[0]?.subjectName || subject
              
              return (
                <div key={subject} className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {subjectName} <span className="text-sm font-normal text-gray-600">({subject})</span>
                  </h3>

                  {/* Paper Subsections */}
                  <div className="space-y-4">
                    {subjectExams.map(exam => (
                      <div key={exam.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <p className="font-medium text-gray-900 mb-3">
                          {exam.paperCode} - {exam.paperName}
                        </p>
                        
                        <form
                          onSubmit={(e) => {
                            e.preventDefault()
                            setTopicsData({
                              selectedSubject: exam.subject,
                              selectedPaper: exam.paperCode,
                              topicsText: ''
                            })
                            handleAddTopics(e)
                          }}
                          className="space-y-3"
                        >
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">
                              Add Topics (one per line)
                            </label>
                            <textarea
                              value={topicsData.selectedPaper === exam.paperCode ? topicsData.topicsText : ''}
                              onChange={(e) => {
                                if (topicsData.selectedPaper === exam.paperCode) {
                                  setTopicsData({ ...topicsData, topicsText: e.target.value })
                                }
                              }}
                              onFocus={() => {
                                setTopicsData({
                                  selectedSubject: exam.subject,
                                  selectedPaper: exam.paperCode,
                                  topicsText: topicsData.selectedPaper === exam.paperCode ? topicsData.topicsText : ''
                                })
                              }}
                              placeholder="Atomic structure&#10;Bonding&#10;States of matter&#10;Energy..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                              rows={3}
                            />
                          </div>
                          
                          {topicsData.selectedPaper === exam.paperCode && (
                            <button
                              type="submit"
                              disabled={loading || !topicsData.topicsText.trim()}
                              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                            >
                              {loading ? 'Adding...' : 'Add Topics'}
                            </button>
                          )}
                        </form>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Generate Plan Section */}
      {exams.length > 0 && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-8 text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-2">🚀 Generate Your Revision Plan</h2>
          <p className="opacity-90 mb-6">The AI will analyze your exams and create a personalized study schedule</p>
          
          {error && error.includes('JSON') && (
            <div className="bg-red-500 bg-opacity-20 border border-red-300 rounded-lg p-4 mb-6">
              <p className="text-sm">⚠️ AI response error. Try again in a moment or skip plan generation and manage topics manually above.</p>
            </div>
          )}
          
          <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">Study Hours Per Day</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={studyHours}
                  onChange={(e) => setStudyHours(Math.max(1, Math.min(12, parseInt(e.target.value) || 4)))}
                  className="w-full px-4 py-2 rounded-lg text-gray-900 font-medium"
                />
                <p className="text-xs mt-1 opacity-75">⏱️ This will take 15-20 seconds to generate...</p>
              </div>
              <button
                onClick={handleGeneratePlan}
                disabled={generating}
                className="px-6 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition disabled:opacity-50 h-fit mt-6"
              >
                {generating ? 'Generating...' : 'Generate Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
