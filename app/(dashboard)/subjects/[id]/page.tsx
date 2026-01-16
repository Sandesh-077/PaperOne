'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

// Subject details page
interface SubjectDetails {
  id: string
  name: string
  type: string
  level?: string
  color?: string
  topics: Array<{
    id: string
    name: string
    description?: string
    completed: boolean
    completedAt?: string
    order: number
    subtopics: Array<{
      id: string
      name: string
      completed: boolean
      order: number
    }>
    _count: {
      revisions: number
      practicePapers: number
      notes: number
    }
  }>
  practicePapers?: Array<{
    id: string
    name: string
    paperType: string
    topicId?: string
    pdfUrl?: string
    createdAt: string
    logs?: Array<{
      id: string
      questionStart: string
      questionEnd: string
      completed: boolean
      score?: number
      totalMarks?: number
      duration?: number
      notes?: string
      date: string
    }>
  }>
}

export default function SubjectDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { status } = useSession()
  const [subject, setSubject] = useState<SubjectDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTopicForm, setShowTopicForm] = useState(false)
  const [showSubtopicForm, setShowSubtopicForm] = useState<string | null>(null)
  const [showPaperForm, setShowPaperForm] = useState(false)
  const [showLogForm, setShowLogForm] = useState<string | null>(null)
  const [expandedPaper, setExpandedPaper] = useState<string | null>(null)
  const [topicFormData, setTopicFormData] = useState({ name: '', description: '' })
  const [subtopicFormData, setSubtopicFormData] = useState({ name: '', description: '' })
  const [paperFormData, setPaperFormData] = useState({
    paperName: '',
    paperType: 'topical',
    topicId: '',
    pdfUrl: '',
    questionStart: '',
    questionEnd: '',
    totalQuestions: '',
  })
  const [logFormData, setLogFormData] = useState({
    questionStart: '',
    questionEnd: '',
    completed: false,
    score: '',
    totalMarks: '',
    duration: '',
    notes: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchSubject()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router])

  const fetchSubject = async () => {
    try {
      const response = await fetch(`/api/subjects/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setSubject(data)
      }
    } catch (error) {
      console.error('Failed to fetch subject:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: params.id,
          ...topicFormData
        })
      })
      if (response.ok) {
        setShowTopicForm(false)
        setTopicFormData({ name: '', description: '' })
        fetchSubject()
      }
    } catch (error) {
      console.error('Failed to add topic:', error)
    }
  }

  const handleAddSubtopic = async (e: React.FormEvent, topicId: string) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/subtopics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId,
          ...subtopicFormData
        })
      })
      if (response.ok) {
        setShowSubtopicForm(null)
        setSubtopicFormData({ name: '', description: '' })
        fetchSubject()
      }
    } catch (error) {
      console.error('Failed to add subtopic:', error)
    }
  }

  const handleAddPaper = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/practice-papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: params.id,
          ...paperFormData,
          topicId: paperFormData.topicId || undefined,
          totalQuestions: paperFormData.totalQuestions ? parseInt(paperFormData.totalQuestions) : undefined,
        })
      })
      if (response.ok) {
        setShowPaperForm(false)
        setPaperFormData({ paperName: '', paperType: 'topical', topicId: '', pdfUrl: '', questionStart: '', questionEnd: '', totalQuestions: '' })
        fetchSubject()
      }
    } catch (error) {
      console.error('Failed to add paper:', error)
    }
  }

  const handleAddLog = async (e: React.FormEvent, paperId: string) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/practice-paper-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          practicePaperId: paperId,
          ...logFormData,
          score: logFormData.score ? parseInt(logFormData.score) : undefined,
          totalMarks: logFormData.totalMarks ? parseInt(logFormData.totalMarks) : undefined,
          duration: logFormData.duration ? parseInt(logFormData.duration) : undefined,
        })
      })
      if (response.ok) {
        setShowLogForm(null)
        setLogFormData({ questionStart: '', questionEnd: '', completed: false, score: '', totalMarks: '', duration: '', notes: '' })
        fetchSubject()
      }
    } catch (error) {
      console.error('Failed to add log:', error)
    }
  }

  const toggleTopicComplete = async (topicId: string, completed: boolean) => {
    try {
      await fetch(`/api/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      })
      fetchSubject()
    } catch (error) {
      console.error('Failed to update topic:', error)
    }
  }

  const toggleSubtopicComplete = async (subtopicId: string, completed: boolean) => {
    try {
      await fetch(`/api/subtopics/${subtopicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed })
      })
      fetchSubject()
    } catch (error) {
      console.error('Failed to update subtopic:', error)
    }
  }

  if (loading || !subject) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading...</div></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/subjects')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: subject.color || '#3B82F6' }}
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{subject.name}</h1>
              <p className="text-sm text-gray-600">{subject.type} {subject.level && `• ${subject.level}`}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPaperForm(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            + Add Paper
          </button>
          <button
            onClick={() => setShowTopicForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Topic
          </button>
        </div>
      </div>

      {/* Practice Papers Section */}
      {subject.practicePapers && subject.practicePapers.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Practice Papers</h2>
          <div className="space-y-4">
            {subject.practicePapers.map((paper: any) => (
              <div key={paper.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2">{paper.name}</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {paper.paperType}
                      </span>
                      {paper.topicId && (
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {subject.topics.find((t: any) => t.id === paper.topicId)?.name || 'Topic'}
                        </span>
                      )}
                    </div>
                  </div>
                  {paper.pdfUrl && (
                    <a
                      href={paper.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 whitespace-nowrap"
                    >
                      📄 PDF →
                    </a>
                  )}
                </div>

                {/* Last log info */}
                {paper.logs && paper.logs.length > 0 && (
                  <div className="bg-white rounded p-2 mb-2 text-sm text-gray-600">
                    <strong>Last session:</strong> Questions {paper.logs[0].questionStart} - {paper.logs[0].questionEnd}
                    {paper.logs[0].score && <span> • Score: {paper.logs[0].score}/{paper.logs[0].totalMarks}</span>}
                  </div>
                )}

                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setShowLogForm(showLogForm === paper.id ? null : paper.id)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    {showLogForm === paper.id ? 'Cancel' : '📝 Log Session'}
                  </button>
                  <button
                    onClick={() => setExpandedPaper(expandedPaper === paper.id ? null : paper.id)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  >
                    {expandedPaper === paper.id ? 'Hide' : `View All (${paper.logs?.length || 0})`}
                  </button>
                </div>

                {/* Log Form */}
                {showLogForm === paper.id && (
                  <form onSubmit={(e) => handleAddLog(e, paper.id)} className="bg-white rounded-lg p-4 border border-green-300 mb-3 space-y-3">
                    <h4 className="font-semibold text-gray-900">Log Practice Session</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Question Start *</label>
                        <input
                          type="text"
                          value={logFormData.questionStart}
                          onChange={(e) => setLogFormData({ ...logFormData, questionStart: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="e.g., 5"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Question End *</label>
                        <input
                          type="text"
                          value={logFormData.questionEnd}
                          onChange={(e) => setLogFormData({ ...logFormData, questionEnd: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="e.g., 10"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
                        <input
                          type="number"
                          value={logFormData.score}
                          onChange={(e) => setLogFormData({ ...logFormData, score: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="e.g., 35"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                        <input
                          type="number"
                          value={logFormData.totalMarks}
                          onChange={(e) => setLogFormData({ ...logFormData, totalMarks: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="e.g., 40"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (mins)</label>
                        <input
                          type="number"
                          value={logFormData.duration}
                          onChange={(e) => setLogFormData({ ...logFormData, duration: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          placeholder="e.g., 45"
                        />
                      </div>
                      <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={logFormData.completed}
                            onChange={(e) => setLogFormData({ ...logFormData, completed: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <span className="text-sm font-medium text-gray-700">Completed</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={logFormData.notes}
                        onChange={(e) => setLogFormData({ ...logFormData, notes: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        rows={2}
                        placeholder="Any notes about this session..."
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Save Log
                    </button>
                  </form>
                )}

                {/* All Logs */}
                {expandedPaper === paper.id && paper.logs && paper.logs.length > 0 && (
                  <div className="bg-white rounded-lg p-3 border border-gray-300">
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm">All Sessions</h4>
                    <div className="space-y-2">
                      {paper.logs.map((log: any) => (
                        <div key={log.id} className="bg-gray-50 rounded p-3 text-sm border border-gray-200">
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <span className="font-medium text-gray-900">Q{log.questionStart} - Q{log.questionEnd}</span>
                              {log.score && <span className="ml-2 text-green-700">({log.score}/{log.totalMarks})</span>}
                              {log.completed && <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">✓ Completed</span>}
                            </div>
                            <span className="text-xs text-gray-500">{new Date(log.date).toLocaleDateString()}</span>
                          </div>
                          {log.duration && <div className="text-gray-600">⏱️ {log.duration} mins</div>}
                          {log.notes && <div className="text-gray-600 italic mt-1">&ldquo;{log.notes}&rdquo;</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Practice Paper Modal */}
      {showPaperForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Practice Paper</h2>
            <form onSubmit={handleAddPaper} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paper Name</label>
                <input
                  type="text"
                  value={paperFormData.paperName}
                  onChange={(e) => setPaperFormData({ ...paperFormData, paperName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., May/June 2023 Paper 1"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paper Type</label>
                  <select
                    value={paperFormData.paperType}
                    onChange={(e) => setPaperFormData({ ...paperFormData, paperType: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="full">Full Paper</option>
                    <option value="topical">Topical</option>
                    <option value="printed">Printed/Physical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic (optional)</label>
                  <select
                    value={paperFormData.topicId}
                    onChange={(e) => setPaperFormData({ ...paperFormData, topicId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">All Topics</option>
                    {subject.topics.map((topic) => (
                      <option key={topic.id} value={topic.id}>{topic.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PDF URL (optional)</label>
                <input
                  type="url"
                  value={paperFormData.pdfUrl}
                  onChange={(e) => setPaperFormData({ ...paperFormData, pdfUrl: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="https://example.com/paper.pdf"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Start</label>
                  <input
                    type="text"
                    value={paperFormData.questionStart}
                    onChange={(e) => setPaperFormData({ ...paperFormData, questionStart: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., 1 or 5a"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question End</label>
                  <input
                    type="text"
                    value={paperFormData.questionEnd}
                    onChange={(e) => setPaperFormData({ ...paperFormData, questionEnd: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., 15 or 8c"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Questions (optional)</label>
                <input
                  type="number"
                  value={paperFormData.totalQuestions}
                  onChange={(e) => setPaperFormData({ ...paperFormData, totalQuestions: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., 20 (leave empty if undefined)"
                  min="1"
                />
                <p className="text-sm text-gray-500 mt-1">If specified, paper will auto-complete when all questions are done</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Add Paper
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaperForm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Topic Modal */}
      {showTopicForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Topic</h2>
            <form onSubmit={handleAddTopic} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Topic Name</label>
                <input
                  type="text"
                  value={topicFormData.name}
                  onChange={(e) => setTopicFormData({ ...topicFormData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Mechanics"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={topicFormData.description}
                  onChange={(e) => setTopicFormData({ ...topicFormData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Brief description..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Topic
                </button>
                <button
                  type="button"
                  onClick={() => setShowTopicForm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Topics List */}
      {subject.topics.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No topics yet. Add your first topic to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subject.topics.map((topic) => (
            <div key={topic.id} className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={topic.completed}
                    onChange={(e) => toggleTopicComplete(topic.id, e.target.checked)}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold ${topic.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {topic.name}
                    </h3>
                    {topic.description && (
                      <p className="text-sm text-gray-600 mt-1">{topic.description}</p>
                    )}
                    {topic.completed && topic.completedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Completed {new Date(topic.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowSubtopicForm(topic.id)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  + Subtopic
                </button>
              </div>

              {/* Subtopics */}
              {topic.subtopics.length > 0 && (
                <div className="ml-8 mt-3 space-y-2">
                  {topic.subtopics.map((subtopic) => (
                    <div key={subtopic.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={subtopic.completed}
                        onChange={(e) => toggleSubtopicComplete(subtopic.id, e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className={`text-sm ${subtopic.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {subtopic.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Subtopic Form */}
              {showSubtopicForm === topic.id && (
                <div className="ml-8 mt-3 bg-gray-50 rounded-lg p-4">
                  <form onSubmit={(e) => handleAddSubtopic(e, topic.id)} className="space-y-3">
                    <input
                      type="text"
                      value={subtopicFormData.name}
                      onChange={(e) => setSubtopicFormData({ ...subtopicFormData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Subtopic name..."
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-3 py-1 text-sm rounded-lg hover:bg-blue-700"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSubtopicForm(null)}
                        className="bg-gray-200 text-gray-700 px-3 py-1 text-sm rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-4 text-xs text-gray-500 mt-3 ml-8">
                {topic._count.revisions > 0 && (
                  <span>📝 {topic._count.revisions} revisions</span>
                )}
                {topic._count.practicePapers > 0 && (
                  <span>📄 {topic._count.practicePapers} papers</span>
                )}
                {topic._count.notes > 0 && (
                  <span>📝 {topic._count.notes} notes</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
