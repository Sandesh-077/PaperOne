'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const DEFAULT_SUBJECTS = ['9701 Chemistry', '9702 Physics', '9709 Mathematics', '9618 Computer Science', '8021 English GP']
const DEFAULT_TASK_TYPES = ['PastPaper', 'Revision', 'Flashcards', 'Notes']
const MISTAKE_TYPES = ['Concept', 'Formula', 'Careless']

export default function SessionLogPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [configTab, setConfigTab] = useState(false)
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
    // Existing
    deepFocusScore: 5,
    questionsAttempted: '', // deprecated
    questionsCorrect: '', // deprecated
    mistakeType: '',
    distractionCount: 0,
    notes: ''
  })

  // Load user config on mount
  useEffect(() => {
    const loadUserConfig = async () => {
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
    }
    if (session) loadUserConfig()
  }, [session])

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
      let paperUrl = uploadedFiles.paperUrl || null
      let notesUrl = uploadedFiles.notesUrl || null

      // Upload paper if selected
      if (paperFile && !paperUrl) {
        paperUrl = await handleFileUpload(paperFile, 'paper')
      }

      // Upload notes - REQUIRED for Notes task type
      if (formData.taskType === 'Notes' && notesFile && !notesUrl) {
        notesUrl = await handleFileUpload(notesFile, 'notes')
        if (!notesUrl) {
          alert('Failed to upload notes PDF. Please try again.')
          setLoading(false)
          return
        }
      }

      const accuracy = calculateAccuracy()
      const response = await fetch('/api/study-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          totalHours: calculateTotalHours(),
          accuracy,
          // Convert marks
          totalMarks: formData.totalMarks ? parseInt(formData.totalMarks) : null,
          obtainedMarks: formData.obtainedMarks ? parseInt(formData.obtainedMarks) : null,
          // Past paper specific
          paperCode: (formData.taskType === 'PastPaper' && !formData.isTopicalPaper) ? formData.paperCode : null,
          paperYear: (formData.taskType === 'PastPaper' && !formData.isTopicalPaper) ? formData.paperYear : null,
          // Topical paper specific
          isTopicalPaper: formData.isTopicalPaper,
          topicalPaperName: formData.isTopicalPaper ? formData.topicalPaperName : null,
          topicalSource: formData.isTopicalPaper ? formData.topicalSource : null,
          uploadedPaperUrl: paperUrl,
          // Notes specific
          notesAuthor: formData.taskType === 'Notes' ? formData.notesAuthor : null,
          notesSource: formData.taskType === 'Notes' ? formData.notesSource : null,
          uploadedNotesUrl: formData.taskType === 'Notes' ? notesUrl : null,
          // Other
          mistakeType: formData.mistakeType || null,
          distractionCount: formData.distractionCount,
          deepFocusScore: formData.deepFocusScore,
          // Deprecated fields (keep for backward compatibility)
          questionsAttempted: null,
          questionsCorrect: null
        })
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
          deepFocusScore: 5,
          questionsAttempted: '',
          questionsCorrect: '',
          mistakeType: '',
          distractionCount: 0,
          notes: ''
        })
        setPaperFile(null)
        setNotesFile(null)
        setUploadedFiles({})
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
          <p className="text-gray-600 mb-6">Log a study session. Each session entry is the single source of truth for all analytics.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date & Time */}
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

            {/* Subject & Topic */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Subject * (Dropdown)</label>
                <select value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} required className="w-full border rounded px-3 py-2">
                  {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Topic *</label>
                <input type="text" value={formData.topic} onChange={(e) => setFormData({...formData, topic: e.target.value})} required placeholder="e.g., Mechanics, Organic Chemistry" className="w-full border rounded px-3 py-2" />
              </div>
            </div>

            {/* Task Type */}
            <div>
              <label className="block text-sm font-semibold mb-2">Task Type *</label>
              <select value={formData.taskType} onChange={(e) => setFormData({...formData, taskType: e.target.value, isTopicalPaper: false})} className="w-full border rounded px-3 py-2">
                {taskTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Conditional: Past Paper Fields */}
            {formData.taskType === 'PastPaper' && (
              <div className="bg-yellow-50 p-4 rounded border-l-4 border-yellow-500">
                <div className="flex items-center mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isTopicalPaper}
                      onChange={(e) => setFormData({...formData, isTopicalPaper: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span className="font-semibold">Is Topical Paper? (not full past paper)</span>
                  </label>
                </div>

                {!formData.isTopicalPaper && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Paper Code *</label>
                      <input type="text" value={formData.paperCode} onChange={(e) => setFormData({...formData, paperCode: e.target.value})} placeholder="e.g., 9702/21" className="w-full border rounded px-3 py-2" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Paper Year *</label>
                      <input type="number" value={formData.paperYear} onChange={(e) => setFormData({...formData, paperYear: parseInt(e.target.value)})} className="w-full border rounded px-3 py-2" required />
                    </div>
                  </div>
                )}

                {formData.isTopicalPaper && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Topical Paper Name/Topic *</label>
                      <input type="text" value={formData.topicalPaperName} onChange={(e) => setFormData({...formData, topicalPaperName: e.target.value})} placeholder="e.g., Mechanics - Circular Motion" className="w-full border rounded px-3 py-2" required />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Source *</label>
                      <input type="text" value={formData.topicalSource} onChange={(e) => setFormData({...formData, topicalSource: e.target.value})} placeholder="e.g., Cambridge notes, KhanAcademy Q18" className="w-full border rounded px-3 py-2" required />
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-sm font-semibold mb-2">Upload Paper (PDF) - Optional</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPaperFile(e.target.files?.[0] || null)}
                    className="w-full border rounded px-3 py-2"
                  />
                  {paperFile && <p className="text-sm text-green-600 mt-1">✓ {paperFile.name}</p>}
                </div>
              </div>
            )}

            {/* Conditional: Notes Fields */}
            {formData.taskType === 'Notes' && (
              <div className="bg-purple-50 p-4 rounded border-l-4 border-purple-500">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Author/Writer of Notes *</label>
                    <input type="text" value={formData.notesAuthor} onChange={(e) => setFormData({...formData, notesAuthor: e.target.value})} placeholder="e.g., Teacher name, TextBook" className="w-full border rounded px-3 py-2" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Source/Where From *</label>
                    <input type="text" value={formData.notesSource} onChange={(e) => setFormData({...formData, notesSource: e.target.value})} placeholder="e.g., Chapter 5, Physics notes folder" className="w-full border rounded px-3 py-2" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Upload Notes (PDF) * REQUIRED</label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setNotesFile(e.target.files?.[0] || null)}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                  {notesFile ? (
                    <p className="text-sm text-green-600 mt-1">✓ {notesFile.name}</p>
                  ) : (
                    <p className="text-sm text-red-600 mt-1">Please upload a PDF file</p>
                  )}
                </div>
              </div>
            )}

            {/* Marks Tracking */}
            <div className="bg-green-50 p-4 rounded border-l-4 border-green-500">
              <h3 className="font-semibold mb-3">📊 Marks Tracking</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Total Marks in Paper/Quiz</label>
                  <input type="number" value={formData.totalMarks} onChange={(e) => setFormData({...formData, totalMarks: e.target.value})} placeholder="e.g., 100" className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Obtained Marks</label>
                  <input type="number" value={formData.obtainedMarks} onChange={(e) => setFormData({...formData, obtainedMarks: e.target.value})} placeholder="e.g., 78" className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              {calculateAccuracy() && (
                <div className="mt-3 p-2 bg-white rounded text-sm text-green-700 font-semibold">
                  Accuracy: <strong>{calculateAccuracy()}%</strong> (auto-calculated)
                </div>
              )}
            </div>

            {/* Deep Focus & Mistakes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Deep Focus Score (1-10) * <span className={`text-xs ${getFocusColor(formData.deepFocusScore)}`}>({formData.deepFocusScore})</span></label>
                <input type="range" min="1" max="10" value={formData.deepFocusScore} onChange={(e) => setFormData({...formData, deepFocusScore: parseInt(e.target.value)})} className="w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Mistake Type (if any)</label>
                <select value={formData.mistakeType} onChange={(e) => setFormData({...formData, mistakeType: e.target.value})} className="w-full border rounded px-3 py-2">
                  <option value="">None</option>
                  {MISTAKE_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {/* Distraction Count */}
            <div>
              <label className="block text-sm font-semibold mb-2">Distraction Count</label>
              <input type="number" min="0" value={formData.distractionCount} onChange={(e) => setFormData({...formData, distractionCount: parseInt(e.target.value)})} className="w-full border rounded px-3 py-2" />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold mb-2">Session Notes & Observations</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} placeholder="What went well? What was difficult? Any breakthroughs?" className="w-full border rounded px-3 py-2" />
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading || (formData.taskType === 'Notes' && !notesFile)} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Logging...' : '✓ Log Session'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}
