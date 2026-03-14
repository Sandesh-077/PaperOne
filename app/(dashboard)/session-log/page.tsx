'use client'

import { useState } from 'react'
import {useRouter, useSession } from 'next-auth/react'

const SUBJECTS = ['9701 Chemistry', '9702 Physics', '9709 Mathematics', '9618 Computer Science', '8021 English GP']
const TASK_TYPES = ['PastPaper', 'Revision', 'Flashcards', 'Notes']
const MISTAKE_TYPES = ['Concept', 'Formula', 'Careless']

export default function SessionLogPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    subject: '9702 Physics',
    topic: '',
    taskType: 'Revision',
    paperCode: '',
    paperYear: new Date().getFullYear(),
    deepFocusScore: 5,
    questionsAttempted: '',
    questionsCorrect: '',
    mistakeType: '',
    distractionCount: 0,
    notes: ''
  })

  const calculateTotalHours = () => {
    const [startH, startM] = formData.startTime.split(':').map(Number)
    const [endH, endM] = formData.endTime.split(':').map(Number)
    const startMins = startH * 60 + startM
    const endMins = endH * 60 + endM
    return (endMins - startMins) / 60
  }

  const calculateAccuracy = () => {
    const att = parseInt(formData.questionsAttempted) ||0
    const corr = parseInt(formData.questionsCorrect) || 0
    if (att > 0) return ((corr / att) * 100).toFixed(2)
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const accuracy = calculateAccuracy()
      const response = await fetch('/api/study-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          totalHours: calculateTotalHours(),
          accuracy,
          questionsAttempted: formData.questionsAttempted ? parseInt(formData.questionsAttempted) : null,
          questionsCorrect: formData.questionsCorrect ? parseInt(formData.questionsCorrect) : null,
          distractionCount: parseInt(formData.distractionCount),
          deepFocusScore: parseInt(formData.deepFocusScore),
          paperCode: formData.taskType === 'PastPaper' ? formData.paperCode : null,
          paperYear: formData.taskType === 'PastPaper' ? parseInt(String(formData.paperYear)) : null,
          mistakeType: formData.mistakeType || null
        })
      })

      if (response.ok) {
        alert('Session logged successfully!')
        setFormData({
          date: new Date().toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '10:00',
          subject: '9702 Physics',
          topic: '',
          taskType: 'Revision',
          paperCode: '',
          paperYear: new Date().getFullYear(),
          deepFocusScore: 5,
          questionsAttempted: '',
          questionsCorrect: '',
          mistakeType: '',
          distractionCount: 0,
          notes: ''
        })
      } else {
        alert('Failed to log session')
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
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-3xl font-bold mb-6">📝 Session Log</h1>
      <p className="text-gray-600 mb-6">Log a study session exactly once. Every view derives from this record.</p>

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
              {SUBJECTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Topic *</label>
            <input type="text" value={formData.topic} onChange={(e) => setFormData({...formData, topic: e.target.value})} required placeholder="e.g., Mechanics, Organic Chem" className="w-full border rounded px-3 py-2" />
          </div>
        </div>

        {/* Task Type */}
        <div>
          <label className="block text-sm font-semibold mb-2">Task Type *</label>
          <select value={formData.taskType} onChange={(e) => setFormData({...formData, taskType: e.target.value})} className="w-full border rounded px-3 py-2">
            {TASK_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* Conditional: Past Paper Fields */}
        {formData.taskType === 'PastPaper' && (
          <div className="grid grid-cols-2 gap-4 bg-yellow-50 p-4 rounded">
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

        {/* Deep Focus & Questions */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Deep Focus Score (1-10) * <span className={`text-xs ${getFocusColor(formData.deepFocusScore)}`}>({formData.deepFocusScore})</span></label>
            <input type="range" min="1" max="10" value={formData.deepFocusScore} onChange={(e) => setFormData({...formData, deepFocusScore: parseInt(e.target.value)})} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Questions Attempted</label>
            <input type="number" value={formData.questionsAttempted} onChange={(e) => setFormData({...formData, questionsAttempted: e.target.value})} placeholder="Optional" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Questions Correct</label>
            <input type="number" value={formData.questionsCorrect} onChange={(e) => setFormData({...formData, questionsCorrect: e.target.value})} placeholder="Optional" className="w-full border rounded px-3 py-2" />
          </div>
        </div>

        {calculateAccuracy() && (
          <div className="bg-green-50 p-3 rounded text-sm text-green-700">
            Accuracy: <strong>{calculateAccuracy()}%</strong> (auto-calculated)
          </div>
        )}

        {/* Mistake & Distraction */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Mistake Type (if any)</label>
            <select value={formData.mistakeType} onChange={(e) => setFormData({...formData, mistakeType: e.target.value})} className="w-full border rounded px-3 py-2">
              <option value="">None</option>
              {MISTAKE_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Distraction Count</label>
            <input type="number" min="0" value={formData.distractionCount} onChange={(e) => setFormData({...formData, distractionCount: parseInt(e.target.value)})} className="w-full border rounded px-3 py-2" />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold mb-2">Notes</label>
          <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={3} placeholder="Session observations, struggles, breakthroughs..." className="w-full border rounded px-3 py-2" />
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Logging...' : '✓ Log Session'}
        </button>
      </form>
    </div>
  )
}
