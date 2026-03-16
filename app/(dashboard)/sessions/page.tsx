'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface StudySession {
  id: string
  date: string
  subject: string
  topic: string
  taskType: string
  totalHours: number
  deepFocusScore: number
  distractionCount: number
  totalMarks?: number
  obtainedMarks?: number
  accuracy?: number
  questionsAttempted?: number
  questionsCorrect?: number
  chapter?: string
  notes?: string
}

const TASK_TYPE_COLORS: Record<string, string> = {
  'Past Paper': 'bg-blue-100 text-blue-800',
  'Revision': 'bg-purple-100 text-purple-800',
  'Practice Questions': 'bg-amber-100 text-amber-800',
  'Flashcards': 'bg-green-100 text-green-800',
  'Notes': 'bg-pink-100 text-pink-800'
}

export default function SessionsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterTaskType, setFilterTaskType] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [editingSession, setEditingSession] = useState<StudySession | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<string[]>([])
  const [taskTypes, setTaskTypes] = useState<string[]>([])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchSessions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router])

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterSubject) params.append('subject', filterSubject)
      if (filterTaskType) params.append('taskType', filterTaskType)
      if (filterStartDate && filterEndDate) {
        params.append('startDate', filterStartDate)
        params.append('endDate', filterEndDate)
      }

      const response = await fetch(`/api/study-sessions?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
        
        // Extract unique subjects and task types
        const uniqueSubjects = [...new Set(data.map((s: StudySession) => s.subject))] as string[]
        const uniqueTaskTypes = [...new Set(data.map((s: StudySession) => s.taskType))] as string[]
        setSubjects(uniqueSubjects.sort())
        setTaskTypes(uniqueTaskTypes.sort())
      }
    } catch (error) {
      alert('Failed to fetch sessions: ' + error)
    } finally {
      setLoading(false)
    }
  }, [filterSubject, filterTaskType, filterStartDate, filterEndDate])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSessions()
    }, 300)
    return () => clearTimeout(timer)
  }, [filterSubject, filterTaskType, filterStartDate, filterEndDate, fetchSessions])

  const handleEdit = (sess: StudySession) => {
    setEditingSession({ ...sess })
  }

  const handleSaveEdit = async () => {
    if (!editingSession) return

    try {
      const response = await fetch(`/api/study-sessions?id=${editingSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: editingSession.subject,
          topic: editingSession.topic,
          taskType: editingSession.taskType,
          deepFocusScore: editingSession.deepFocusScore,
          distractionCount: editingSession.distractionCount,
          totalMarks: editingSession.totalMarks,
          obtainedMarks: editingSession.obtainedMarks,
          questionsAttempted: editingSession.questionsAttempted,
          questionsCorrect: editingSession.questionsCorrect,
          chapter: editingSession.chapter,
          notes: editingSession.notes
        })
      })

      if (response.ok) {
        alert('Session updated successfully!')
        setEditingSession(null)
        fetchSessions()
      } else {
        alert('Failed to update session')
      }
    } catch (error) {
      alert('Error: ' + error)
    }
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      const response = await fetch(`/api/study-sessions?id=${sessionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Session deleted successfully!')
        setSessions(sessions.filter(s => s.id !== sessionId))
        setDeletingSessionId(null)
      } else {
        alert('Failed to delete session')
      }
    } catch (error) {
      alert('Error: ' + error)
    }
  }

  const filteredSessions = sessions.filter(s => {
    const searchLower = searchTerm.toLowerCase()
    return (
      s.subject.toLowerCase().includes(searchLower) ||
      s.topic.toLowerCase().includes(searchLower) ||
      s.taskType.toLowerCase().includes(searchLower)
    )
  })

  const getTaskTypeColor = (taskType: string) => {
    return TASK_TYPE_COLORS[taskType] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  if (status === 'loading' || loading) {
    return <div className="p-6 text-center">Loading sessions...</div>
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6">📚 All Study Sessions</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
        <div>
          <label className="block text-sm font-semibold mb-1">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search subject, topic..."
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Subject</label>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Task Type</label>
          <select
            value={filterTaskType}
            onChange={(e) => setFilterTaskType(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            {taskTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">From</label>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">To</label>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Results */}
      {filteredSessions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No sessions found</p>
          <p className="text-sm">Try adjusting your filters or log a new session</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 font-semibold">{filteredSessions.length} sessions found</p>
          {filteredSessions.map(sess => (
            <div key={sess.id} className="border rounded-lg p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex gap-2 items-center mb-2">
                    <h3 className="font-bold text-lg">{sess.subject}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTaskTypeColor(sess.taskType)}`}>
                      {sess.taskType}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">📄 {sess.topic}</p>
                  <p className="text-xs text-gray-500">📅 {formatDate(sess.date)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(sess)}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(sess.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              {/* Session Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3 pt-3 border-t">
                <div>
                  <span className="text-gray-600">Hours</span>
                  <p className="font-semibold">{sess.totalHours.toFixed(2)}h</p>
                </div>
                <div>
                  <span className="text-gray-600">Focus Score</span>
                  <p className="font-semibold text-blue-600">{sess.deepFocusScore}/10</p>
                </div>
                <div>
                  <span className="text-gray-600">Distractions</span>
                  <p className="font-semibold">{sess.distractionCount}</p>
                </div>
                {sess.taskType === 'Past Paper' && sess.totalMarks && (
                  <div>
                    <span className="text-gray-600">Score</span>
                    <p className="font-semibold text-green-600">{sess.obtainedMarks}/{sess.totalMarks} ({sess.accuracy?.toFixed(1)}%)</p>
                  </div>
                )}
                {sess.taskType === 'Practice Questions' && sess.questionsAttempted && (
                  <div>
                    <span className="text-gray-600">Questions</span>
                    <p className="font-semibold text-amber-600">{sess.questionsCorrect}/{sess.questionsAttempted}</p>
                  </div>
                )}
                {sess.taskType === 'Revision' && sess.chapter && (
                  <div>
                    <span className="text-gray-600">Chapter</span>
                    <p className="font-semibold text-purple-600">{sess.chapter}</p>
                  </div>
                )}
              </div>

              {sess.notes && (
                <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                  <span className="font-semibold">Notes:</span> {sess.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Edit Session</h2>
              <button
                onClick={() => setEditingSession(null)}
                className="text-2xl text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Subject</label>
                <input
                  type="text"
                  value={editingSession.subject}
                  onChange={(e) => setEditingSession({...editingSession, subject: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Topic</label>
                <input
                  type="text"
                  value={editingSession.topic}
                  onChange={(e) => setEditingSession({...editingSession, topic: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Task Type</label>
                <select
                  value={editingSession.taskType}
                  onChange={(e) => setEditingSession({...editingSession, taskType: e.target.value})}
                  className="w-full border rounded px-3 py-2"
                >
                  <option>Past Paper</option>
                  <option>Revision</option>
                  <option>Practice Questions</option>
                  <option>Flashcards</option>
                  <option>Notes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Deep Focus Score</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editingSession.deepFocusScore}
                  onChange={(e) => setEditingSession({...editingSession, deepFocusScore: parseInt(e.target.value)})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Distractions</label>
                <input
                  type="number"
                  min="0"
                  value={editingSession.distractionCount}
                  onChange={(e) => setEditingSession({...editingSession, distractionCount: parseInt(e.target.value)})}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              {editingSession.taskType === 'Past Paper' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Total Marks</label>
                    <input
                      type="number"
                      value={editingSession.totalMarks || ''}
                      onChange={(e) => setEditingSession({...editingSession, totalMarks: e.target.value ? parseInt(e.target.value) : undefined})}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Obtained Marks</label>
                    <input
                      type="number"
                      value={editingSession.obtainedMarks || ''}
                      onChange={(e) => setEditingSession({...editingSession, obtainedMarks: e.target.value ? parseInt(e.target.value) : undefined})}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </>
              )}
              {editingSession.taskType === 'Revision' && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Chapter</label>
                  <input
                    type="text"
                    value={editingSession.chapter || ''}
                    onChange={(e) => setEditingSession({...editingSession, chapter: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              )}
              {editingSession.taskType === 'Practice Questions' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Questions Attempted</label>
                    <input
                      type="number"
                      value={editingSession.questionsAttempted || ''}
                      onChange={(e) => setEditingSession({...editingSession, questionsAttempted: e.target.value ? parseInt(e.target.value) : undefined})}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Correct Answers</label>
                    <input
                      type="number"
                      value={editingSession.questionsCorrect || ''}
                      onChange={(e) => setEditingSession({...editingSession, questionsCorrect: e.target.value ? parseInt(e.target.value) : undefined})}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Notes</label>
              <textarea
                value={editingSession.notes || ''}
                onChange={(e) => setEditingSession({...editingSession, notes: e.target.value})}
                rows={3}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setEditingSession(null)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
