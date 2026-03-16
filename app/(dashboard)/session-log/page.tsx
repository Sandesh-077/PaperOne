'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const DEFAULT_SUBJECTS = ['9701 Chemistry', '9702 Physics', '9709 Mathematics', '9618 Computer Science', '8021 English GP']
const DEFAULT_TASK_TYPES = ['PastPaper', 'Revision', 'Flashcards', 'Notes']
const MISTAKE_TYPES = ['Concept', 'Formula', 'Careless']

interface ExamEntry {
  id: string
  subject: string
  subjectName: string
  paperCode: string
  paperName: string
  examDate: string
  timeSlot: string
}

export default function SessionLogPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [configTab, setConfigTab] = useState(false)
  const [mode, setMode] = useState<'exam' | 'custom'>('exam')
  const [examEntries, setExamEntries] = useState<ExamEntry[]>([])
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS)
  const [taskTypes, setTaskTypes] = useState<string[]>(DEFAULT_TASK_TYPES)
  const [newSubject, setNewSubject] = useState('')
  const [newTaskType, setNewTaskType] = useState('')
  const [paperFile, setPaperFile] = useState<File | null>(null)
  const [notesFile, setNotesFile] = useState<File | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<{paperUrl?: string, notesUrl?: string}>({})

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    subject: DEFAULT_SUBJECTS[1],
    topic: '',
    taskType: 'Revision',
    // Past Paper Fields
    paperCode: '',
    paperYear: new Date().getFullYear(),
    isTopicalPaper: false,
    topicalPaperName: '',
    topicalSource: '',
    // Notes Fields
    notesAuthor: '',
    notesSource: '',
    // Marks Tracking
    totalMarks: '',
    obtainedMarks: '',
    // Revision & Practice Fields
    chapter: '',
    questionsAttempted: '',
    // Existing
    deepFocusScore: 5,
    questionsAttempted: '', // deprecated
    questionsCorrect: '', // deprecated
    mistakeType: '',
    distractionCount: 0,
    notes: ''
  })

  // Load user config and last used mode on mount
  useEffect(() => {
    const loadInitialData = async () => {
      // Load last used mode from localStorage
      const savedMode = localStorage.getItem('sessionLogMode') as 'exam' | 'custom' | null
      if (savedMode) {
        setMode(savedMode)
      }

      if (session) {
        // Load user config
        try {
          const response = await fetch('/api/user-config')
          if (response.ok) {
            const data = await response.json()
            if (data.customSubjects?.length > 0) {
              setSubjects([...DEFAULT_SUBJECTS, ...data.customSubjects])
            }
            if (data.customTaskTypes?.length > 0) {
              setTaskTypes([...DEFAULT_TASK_TYPES, ...data.customTaskTypes])
            }
          }
        } catch (error) {
          console.error('Failed to load user config:', error)
        }

        // Load exam entries for Exam Subject mode
        try {
          const response = await fetch('/api/exam-entries')
          if (response.ok) {
            const data = await response.json()
            setExamEntries(data.entries || [])
          }
        } catch (error) {
          console.error('Failed to load exam entries:', error)
        }
      }
    }
    loadInitialData()
  }, [session])

  const handleModeChange = (newMode: 'exam' | 'custom') => {
    setMode(newMode)
    localStorage.setItem('sessionLogMode', newMode)
  }

  // Get unique subjects from exam entries for Exam Subject mode
  const getExamSubjects = () => {
    const subjects = new Map<string, ExamEntry[]>()
    examEntries.forEach(entry => {
      if (!subjects.has(entry.subject)) {
        subjects.set(entry.subject, [])
      }
      subjects.get(entry.subject)!.push(entry)
    })
    return subjects
  }

  // Get papers for selected subject in Exam Subject mode
  const getPapersForSubject = (subjectCode: string) => {
    const subjectMap = getExamSubjects()
    return subjectMap.get(subjectCode) || []
  }

  const calculateTotalHours = () => {
    const [startH, startM] = formData.startTime.split(':').map(Number)
    const [endH, endM] = formData.endTime.split(':').map(Number)
    const startMins = startH * 60 + startM
    const endMins = endH * 60 + endM
    return Math.max(0, (endMins - startMins) / 60)
  }

  const calculateAccuracy = () => {
    const total = parseInt(formData.totalMarks) || 0
    const obtained = parseInt(formData.obtainedMarks) || 0
    if (total > 0) return ((obtained / total) * 100).toFixed(2)
    return null
  }

  const handleAddSubject = async () => {
    if (!newSubject.trim()) return
    const updatedSubjects = [...subjects, newSubject]
    setSubjects(updatedSubjects)
    
    // Save to user config
    await fetch('/api/user-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        customSubjects: updatedSubjects.filter(s => !DEFAULT_SUBJECTS.includes(s))
      })
    }).catch(err => console.error('Failed to save config:', err))
    
    setNewSubject('')
    if (!formData.subject) {
      setFormData({...formData, subject: newSubject})
    }
  }

  const handleAddTaskType = async () => {
    if (!newTaskType.trim()) return
    const updatedTypes = [...taskTypes, newTaskType]
    setTaskTypes(updatedTypes)
    
    // Save to user config
    await fetch('/api/user-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        customTaskTypes: updatedTypes.filter(t => !DEFAULT_TASK_TYPES.includes(t))
      })
    }).catch(err => console.error('Failed to save config:', err))
    
    setNewTaskType('')
  }

  const handleFileUpload = async (file: File, type: 'paper' | 'notes'): Promise<string | null> => {
    const formDataObj = new FormData()
    formDataObj.append('file', file)
    formDataObj.append('type', type)
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataObj
      })
      if (response.ok) {
        const data = await response.json()
        return data.url
      }
    } catch (error) {
      console.error('Upload failed:', error)
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: any = {
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        subject: formData.subject,
        taskType: formData.taskType,
        totalHours: calculateTotalHours(),
        deepFocusScore: formData.deepFocusScore,
        notes: formData.notes,
      }

      // Mode-specific fields
      if (mode === 'exam') {
        payload.topic = formData.paperCode // For exam subject, topic = paper code
        // Only require marks for Past Paper mode
        if (formData.taskType === 'Past Paper') {
          payload.totalMarks = formData.totalMarks ? parseInt(formData.totalMarks) : null
          payload.obtainedMarks = formData.obtainedMarks ? parseInt(formData.obtainedMarks) : null
          const accuracy = calculateAccuracy()
          payload.accuracy = accuracy ? parseFloat(accuracy) : null
        }
        // Add chapter for Revision mode
        if (formData.taskType === 'Revision' && formData.chapter) {
          payload.chapter = formData.chapter
        }
        // Add questions count for Practice Questions mode
        if (formData.taskType === 'Practice Questions' && formData.questionsAttempted) {
          payload.questionsAttempted = parseInt(formData.questionsAttempted)
        }
        payload.distractionCount = formData.distractionCount
      } else if (mode === 'custom') {
        payload.topic = '' // Custom mode doesn't require topic
      }

      const response = await fetch('/api/study-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        alert('Session logged successfully!')
        setFormData({
          date: new Date().toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '10:00',
          subject: DEFAULT_SUBJECTS[1],
          topic: '',
          taskType: 'Revision',
          paperCode: '',
          paperYear: new Date().getFullYear(),
          isTopicalPaper: false,
          topicalPaperName: '',
          topicalSource: '',
          notesAuthor: '',
          notesSource: '',
          totalMarks: '',
          obtainedMarks: '',
          chapter: '',
          deepFocusScore: 5,
          questionsAttempted: '',
          questionsCorrect: '',
          mistakeType: '',
          distractionCount: 0,
          notes: ''
        })
      } else {
        const error = await response.text()
        alert('Failed to log session: ' + error)
      }
    } catch (error) {
      alert('Error: ' + error)
    } finally {
      setLoading(false)
    }
  }

  const getFocusColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📝 Session Log</h1>
        <button
          onClick={() => setConfigTab(!configTab)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          {configTab ? '✕ Close Config' : '⚙️ Config'}
        </button>
      </div>

      {configTab ? (
        // CONFIG TAB
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-4">📋 Manage Custom Subjects & Task Types</h2>
          
          {/* Custom Subjects */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Add Custom Subject</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g., Advanced Quantum Physics, SAT Prep"
                className="flex-1 border rounded px-3 py-2"
              />
              <button
                type="button"
                onClick={handleAddSubject}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="text-sm text-gray-600 mb-2">Your subjects:</p>
              <div className="flex flex-wrap gap-2">
                {subjects.map(s => (
                  <span key={s} className={`px-3 py-1 rounded text-sm ${DEFAULT_SUBJECTS.includes(s) ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Task Types */}
          <div>
            <h3 className="font-semibold mb-2">Add Custom Task Type</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newTaskType}
                onChange={(e) => setNewTaskType(e.target.value)}
                placeholder="e.g., ModelAnswers, PastYearQuestions"
                className="flex-1 border rounded px-3 py-2"
              />
              <button
                type="button"
                onClick={handleAddTaskType}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="text-sm text-gray-600 mb-2">Your task types:</p>
              <div className="flex flex-wrap gap-2">
                {taskTypes.map(t => (
                  <span key={t} className={`px-3 py-1 rounded text-sm ${DEFAULT_TASK_TYPES.includes(t) ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // SESSION LOG FORM
        <>
          <p className="text-gray-600 mb-4">Log a study session. Each session entry is the single source of truth for all analytics.</p>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => handleModeChange('exam')}
              className={`px-4 py-2 rounded-full font-semibold transition ${
                mode === 'exam'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📚 Exam Subject
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('custom')}
              className={`px-4 py-2 rounded-full font-semibold transition ${
                mode === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ✨ Custom / Other
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Shared: Date & Time */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Date *</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} required className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Start Time *</label>
                <input type="time" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} required className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">End Time *</label>
                <input type="time" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} required className="w-full border rounded px-3 py-2" />
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded text-sm text-blue-700">
              Total Hours: <strong>{calculateTotalHours().toFixed(2)}</strong> (auto-calculated)
            </div>

            {/* MODE 1: EXAM SUBJECT */}
            {mode === 'exam' && (
              <>
                {/* Subject Selection */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Subject * (from your exams)</label>
                  {examEntries.length === 0 ? (
                    <div className="bg-amber-50 p-3 rounded border border-amber-200 text-sm text-amber-700">
                      No exam entries found. <a href="/planner/setup" className="underline font-semibold">Set up your exams first →</a>
                    </div>
                  ) : (
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value, paperCode: ''})}
                      required
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select a subject...</option>
                      {Array.from(getExamSubjects().entries()).map(([code, papers]) => (
                        <option key={code} value={code}>
                          {papers[0]?.subjectName} ({code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Paper Selection */}
                {formData.subject && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">Paper *</label>
                    <select
                      value={formData.paperCode}
                      onChange={(e) => setFormData({...formData, paperCode: e.target.value})}
                      required
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select a paper...</option>
                      {getPapersForSubject(formData.subject).map((paper) => (
                        <option key={paper.id} value={paper.paperCode}>
                          {paper.paperName} ({paper.paperCode})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Task Type: 3 Toggle Buttons */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Task Type *</label>
                  <div className="flex gap-2">
                    {['Past Paper', 'Revision', 'Practice Questions'].map((type) => (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setFormData({...formData, taskType: type})}
                        className={`flex-1 px-3 py-2 rounded font-semibold transition ${
                          formData.taskType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Marks Section - Only for Past Paper */}
                {formData.taskType === 'Past Paper' && (
                  <div className="bg-green-50 p-4 rounded border-l-4 border-green-500">
                    <h3 className="font-semibold mb-3">📊 Marks Tracking</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Total Marks *</label>
                        <input
                          type="number"
                          value={formData.totalMarks}
                          onChange={(e) => setFormData({...formData, totalMarks: e.target.value})}
                          placeholder="e.g., 100"
                          required
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Obtained Marks *</label>
                        <input
                          type="number"
                          value={formData.obtainedMarks}
                          onChange={(e) => setFormData({...formData, obtainedMarks: e.target.value})}
                          placeholder="e.g., 78"
                          required
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                    </div>
                    {calculateAccuracy() && (
                      <div className="mt-3 p-2 bg-white rounded text-sm text-green-700 font-semibold">
                        Accuracy: <strong>{calculateAccuracy()}%</strong> (auto-calculated)
                      </div>
                    )}
                  </div>
                )}

                {/* Revision: Chapter Field */}
                {formData.taskType === 'Revision' && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">Chapter / Topic</label>
                    <input
                      type="text"
                      value={formData.chapter}
                      onChange={(e) => setFormData({...formData, chapter: e.target.value})}
                      placeholder="e.g., Chapter 5 - Thermodynamics"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                )}

                {/* Practice Questions: Questions Count Field */}
                {formData.taskType === 'Practice Questions' && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">Number of Questions Attempted</label>
                    <input
                      type="number"
                      value={formData.questionsAttempted}
                      onChange={(e) => setFormData({...formData, questionsAttempted: e.target.value})}
                      placeholder="e.g., 25"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                )}

                {/* Deep Focus Score Slider */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Deep Focus Score (1-10) * <span className={`text-xs ${getFocusColor(formData.deepFocusScore)}`}>({formData.deepFocusScore})</span></label>
                  <input type="range" min="1" max="10" value={formData.deepFocusScore} onChange={(e) => setFormData({...formData, deepFocusScore: parseInt(e.target.value)})} className="w-full" />
                </div>

                {/* Distraction Count Stepper */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Distraction Count</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, distractionCount: Math.max(0, formData.distractionCount - 1)})}
                      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 font-semibold"
                    >
                      −
                    </button>
                    <span className="text-lg font-semibold min-w-[50px] text-center">{formData.distractionCount}</span>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, distractionCount: formData.distractionCount + 1})}
                      className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* MODE 2: CUSTOM / OTHER */}
            {mode === 'custom' && (
              <>
                {/* Subject Input */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Subject *</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="e.g., SAT Prep, Coding Practice"
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                {/* Task Type Input */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Task Type *</label>
                  <input
                    type="text"
                    value={formData.taskType}
                    onChange={(e) => setFormData({...formData, taskType: e.target.value})}
                    placeholder="e.g., Reading, Coding Challenge, Mock Test"
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                {/* Deep Focus Score Slider */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Deep Focus Score (1-10) * <span className={`text-xs ${getFocusColor(formData.deepFocusScore)}`}>({formData.deepFocusScore})</span></label>
                  <input type="range" min="1" max="10" value={formData.deepFocusScore} onChange={(e) => setFormData({...formData, deepFocusScore: parseInt(e.target.value)})} className="w-full" />
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold mb-2">Session Notes & Observations</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} placeholder="What went well? What was difficult? Any breakthroughs?" className="w-full border rounded px-3 py-2" />
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Logging...' : '✓ Log Session'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
