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
  const [showMistakeModal, setShowMistakeModal] = useState(false)
  const [sessionSaved, setSessionSaved] = useState(false)
  const [savedSessionData, setSavedSessionData] = useState<{subject: string, topic: string} | null>(null)
  const [mistakeBannerDismissed, setMistakeBannerDismissed] = useState(false)
  const [mistakeLoading, setMistakeLoading] = useState(false)
  const [mistakeSaved, setMistakeSaved] = useState(false)

  const [mistakeFormData, setMistakeFormData] = useState({
    whatWentWrong: '',
    mistakeType: 'Concept',
    correctMethod: '',
    formulaOrConcept: ''
  })

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
    questionsCorrect: '',
    // Session tracking
    deepFocusScore: 5,
    mistakeType: '',
    distractionCount: 0,
    notes: ''
  })
  const [paperTopics, setPaperTopics] = useState<string[]>([])

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

  // Fetch topics for selected paper (THING 5)
  const fetchPaperTopics = async (paperCode: string) => {
    if (!paperCode) {
      setPaperTopics([])
      return
    }
    try {
      const response = await fetch(`/api/paper-topics?paperCode=${encodeURIComponent(paperCode)}`)
      if (response.ok) {
        const data = await response.json()
        const topicNames = (data.topics || []).map((t: any) => t.topicName).sort()
        setPaperTopics(topicNames)
      }
    } catch (error) {
      console.error('Failed to fetch paper topics:', error)
      setPaperTopics([])
    }
  }

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
        // For exam subject, use selected topic if available, otherwise use paperCode
        payload.topic = formData.topic || formData.paperCode
        payload.paperCode = formData.paperCode
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
        // Add questions tracking for Practice Questions mode
        if (formData.taskType === 'Practice Questions') {
          if (formData.topic) {
            payload.topic = formData.topic
          }
          if (formData.questionsAttempted) {
            payload.questionsAttempted = parseInt(formData.questionsAttempted)
          }
          if (formData.questionsCorrect) {
            payload.questionsCorrect = parseInt(formData.questionsCorrect)
          }
          // Calculate accuracy if both present
          if (formData.questionsAttempted && formData.questionsCorrect) {
            const accuracy = (parseInt(formData.questionsCorrect) / parseInt(formData.questionsAttempted)) * 100
            payload.accuracy = parseFloat(accuracy.toFixed(2))
          }
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
        // Store session data for mistake logging
        setSavedSessionData({
          subject: formData.subject,
          topic: formData.topic || formData.paperCode || ''
        })
        setSessionSaved(true)
        setMistakeBannerDismissed(false)
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

  const handleAISuggestion = async () => {
    if (!mistakeFormData.whatWentWrong || !savedSessionData) return
    
    setMistakeLoading(true)
    try {
      const res = await fetch('/api/ai/mistake-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: savedSessionData.subject,
          topic: savedSessionData.topic,
          whatWentWrong: mistakeFormData.whatWentWrong
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        setMistakeFormData(prev => ({
          ...prev,
          correctMethod: data.suggestion
        }))
      }
    } catch (error) {
      console.error('Error getting AI suggestion:', error)
    } finally {
      setMistakeLoading(false)
    }
  }

  const handleSaveMistake = async () => {
    if (!mistakeFormData.whatWentWrong || !savedSessionData) return
    
    try {
      const res = await fetch('/api/mistake-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          subject: savedSessionData.subject,
          topic: savedSessionData.topic,
          whatWentWrong: mistakeFormData.whatWentWrong,
          correctMethod: mistakeFormData.correctMethod,
          formulaOrConcept: mistakeFormData.formulaOrConcept,
          mistakeType: mistakeFormData.mistakeType
        })
      })
      
      if (res.ok) {
        setMistakeSaved(true)
        // Reset after 2 seconds
        setTimeout(() => {
          setMistakeFormData({
            whatWentWrong: '',
            mistakeType: 'Concept',
            correctMethod: '',
            formulaOrConcept: ''
          })
          setMistakeSaved(false)
        }, 2000)
      }
    } catch (error) {
      console.error('Error saving mistake:', error)
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
                      onChange={(e) => {
                        setFormData({...formData, paperCode: e.target.value, topic: ''})
                        fetchPaperTopics(e.target.value)
                      }}
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

                {/* Topic Selection - Appears after paperCode is selected (THING 5) */}
                {formData.paperCode && paperTopics.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold mb-2">Topic (Optional)</label>
                    <select
                      value={formData.topic}
                      onChange={(e) => setFormData({...formData, topic: e.target.value})}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">General revision</option>
                      {paperTopics.map((topicName) => (
                        <option key={topicName} value={topicName}>
                          {topicName}
                        </option>
                      ))}
                      <option value="">Other</option>
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
                  <div className="bg-purple-50 p-4 rounded border-l-4 border-purple-500">
                    <h3 className="font-semibold mb-3">📖 Revision Details</h3>
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
                  </div>
                )}

                {/* Practice Questions: Topic, Questions Count & Accuracy */}
                {formData.taskType === 'Practice Questions' && (
                  <div className="bg-amber-50 p-4 rounded border-l-4 border-amber-500">
                    <h3 className="font-semibold mb-3">🎯 Practice Questions Tracking</h3>
                    <div className="mb-4">
                      <label className="block text-sm font-semibold mb-2">Topic</label>
                      <input
                        type="text"
                        value={formData.topic}
                        onChange={(e) => setFormData({...formData, topic: e.target.value})}
                        placeholder="e.g., Stoichiometry, Quadratic Equations"
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Questions Attempted</label>
                        <input
                          type="number"
                          value={formData.questionsAttempted}
                          onChange={(e) => setFormData({...formData, questionsAttempted: e.target.value})}
                          placeholder="e.g., 25"
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Correct Answers</label>
                        <input
                          type="number"
                          value={formData.questionsCorrect}
                          onChange={(e) => setFormData({...formData, questionsCorrect: e.target.value})}
                          placeholder="e.g., 20"
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                    </div>
                    {formData.questionsAttempted && formData.questionsCorrect && (
                      <div className="mt-3 p-2 bg-white rounded text-sm text-amber-700 font-semibold">
                        Accuracy: <strong>{((parseInt(formData.questionsCorrect) / parseInt(formData.questionsAttempted)) * 100).toFixed(2)}%</strong> (auto-calculated)
                      </div>
                    )}
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

          {/* Session Saved - Quick Mistake Banner */}
          {sessionSaved && !mistakeBannerDismissed && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-green-900">✓ Session logged!</h3>
                  <p className="text-sm text-green-700">Made any mistakes? Log them quickly.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowMistakeModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                  >
                    Log a mistake
                  </button>
                  <button
                    onClick={() => setMistakeBannerDismissed(true)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    No mistakes
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Mistake Modal - Slide Over */}
      {showMistakeModal && savedSessionData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full max-w-md bg-white rounded-t-lg shadow-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            {mistakeSaved ? (
              <div className="text-center py-8">
                <p className="text-green-600 font-semibold text-lg">✓ Mistake saved!</p>
                <button
                  onClick={() => {
                    setMistakeFormData({
                      whatWentWrong: '',
                      mistakeType: 'Concept',
                      correctMethod: '',
                      formulaOrConcept: ''
                    })
                    setMistakeSaved(false)
                  }}
                  className="mt-4 text-blue-600 font-semibold hover:underline"
                >
                  Log another
                </button>
                <button
                  onClick={() => {
                    setShowMistakeModal(false)
                    setMistakeSaved(false)
                  }}
                  className="block mt-2 text-gray-600 font-semibold hover:underline"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold">Log Mistake</h2>
                  <button
                    onClick={() => setShowMistakeModal(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {/* Pre-filled read-only fields */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded">
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Subject</label>
                    <p className="text-sm font-medium">{savedSessionData.subject}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Topic</label>
                    <p className="text-sm font-medium">{savedSessionData.topic}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-gray-600">Date</label>
                    <p className="text-sm font-medium">{new Date().toISOString().split('T')[0]}</p>
                  </div>
                </div>

                {/* What Went Wrong */}
                <div>
                  <label className="block text-sm font-semibold mb-1">What went wrong? *</label>
                  <textarea
                    value={mistakeFormData.whatWentWrong}
                    onChange={(e) => setMistakeFormData(prev => ({...prev, whatWentWrong: e.target.value}))}
                    placeholder="Describe the mistake..."
                    className="w-full border rounded px-3 py-2 text-sm resize-none h-20"
                    required
                  />
                </div>

                {/* Mistake Type Toggle */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Mistake Type</label>
                  <div className="flex gap-2">
                    {['Concept', 'Formula', 'Careless'].map(type => (
                      <button
                        key={type}
                        onClick={() => setMistakeFormData(prev => ({...prev, mistakeType: type}))}
                        className={`flex-1 px-3 py-2 rounded text-sm font-semibold transition ${
                          mistakeFormData.mistakeType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Correct Method */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-semibold">Correct Method</label>
                    <button
                      type="button"
                      onClick={handleAISuggestion}
                      disabled={mistakeLoading || !mistakeFormData.whatWentWrong}
                      className="text-xs text-blue-600 font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {mistakeLoading ? '⏳ AI thinking...' : '✨ AI: suggest'}
                    </button>
                  </div>
                  <textarea
                    value={mistakeFormData.correctMethod}
                    onChange={(e) => setMistakeFormData(prev => ({...prev, correctMethod: e.target.value}))}
                    placeholder="How should it be done?"
                    className="w-full border rounded px-3 py-2 text-sm resize-none h-20"
                  />
                </div>

                {/* Formula or Concept */}
                <div>
                  <label className="block text-sm font-semibold mb-1">Formula / Concept Involved</label>
                  <input
                    type="text"
                    value={mistakeFormData.formulaOrConcept}
                    onChange={(e) => setMistakeFormData(prev => ({...prev, formulaOrConcept: e.target.value}))}
                    placeholder="e.g., e = mc²"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveMistake}
                  disabled={!mistakeFormData.whatWentWrong}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Mistake
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
