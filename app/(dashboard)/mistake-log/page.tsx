'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const SUBJECTS = [
  '9701 Chemistry',
  '9702 Physics',
  '9709 Mathematics',
  '9618 Computer Science',
  '8021 English GP'
]

interface MistakeLogEntry {
  id: string
  date: string
  subject: string
  topic: string
  whatWentWrong: string
  correctMethod: string
  formulaOrConcept: string
  mistakeType: string
  reviewed: boolean
}

export default function MistakeLogPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    subject: SUBJECTS[0],
    topic: '',
    whatWentWrong: '',
    correctMethod: '',
    formulaOrConcept: '',
    mistakeType: 'Concept'
  })
  const [mistakes, setMistakes] = useState<MistakeLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated') {
      fetchMistakes()
    }
  }, [status, router])

  const fetchMistakes = async () => {
    try {
      const res = await fetch('/api/mistake-log?limit=30')
      if (res.ok) {
        const data = await res.json()
        setMistakes(data)
      }
    } catch (error) {
      console.error('Error fetching mistakes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/mistake-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setFormData({
          date: new Date().toISOString().split('T')[0],
          subject: SUBJECTS[0],
          topic: '',
          whatWentWrong: '',
          correctMethod: '',
          formulaOrConcept: '',
          mistakeType: 'Concept'
        })
        fetchMistakes()
      }
    } catch (error) {
      console.error('Error submitting mistake:', error)
    }
  }

  const toggleReviewed = async (id: string, currentReviewed: boolean) => {
    try {
      const res = await fetch(`/api/mistake-log/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewed: !currentReviewed })
      })
      if (res.ok) {
        fetchMistakes()
      }
    } catch (error) {
      console.error('Error updating mistake:', error)
    }
  }

  if (status === 'loading' || loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Mistake Log</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Log New Mistake</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg bg-white"
              >
                {SUBJECTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Topic</label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData({...formData, topic: e.target.value})}
              placeholder="e.g., Organic Chemistry, Thermodynamics"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">What Went Wrong?</label>
              <textarea
                value={formData.whatWentWrong}
                onChange={(e) => setFormData({...formData, whatWentWrong: e.target.value})}
                placeholder="Describe the mistake..."
                className="w-full px-3 py-2 border rounded-lg h-20 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Correct Method</label>
              <textarea
                value={formData.correctMethod}
                onChange={(e) => setFormData({...formData, correctMethod: e.target.value})}
                placeholder="How should it be done?"
                className="w-full px-3 py-2 border rounded-lg h-20 resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Formula or Concept</label>
              <input
                type="text"
                value={formData.formulaOrConcept}
                onChange={(e) => setFormData({...formData, formulaOrConcept: e.target.value})}
                placeholder="e.g., e = mc², second law of thermodynamics"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mistake Type</label>
              <select
                value={formData.mistakeType}
                onChange={(e) => setFormData({...formData, mistakeType: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg bg-white"
              >
                <option>Concept</option>
                <option>Formula</option>
                <option>Careless</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Save Mistake
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-xl font-bold p-6 border-b">Recent Mistakes (Last 30)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Subject</th>
                <th className="px-4 py-2 text-left">Topic</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">What Went Wrong</th>
                <th className="px-4 py-2 text-center">Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {mistakes.map(mistake => (
                <tr
                  key={mistake.id}
                  className={mistake.reviewed ? 'bg-gray-100 text-gray-600' : 'hover:bg-gray-50'}
                >
                  <td className="px-4 py-2">{new Date(mistake.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2 font-medium">{mistake.subject}</td>
                  <td className="px-4 py-2">{mistake.topic}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      mistake.mistakeType === 'Concept' ? 'bg-red-100 text-red-700' :
                      mistake.mistakeType === 'Formula' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {mistake.mistakeType}
                    </span>
                  </td>
                  <td className="px-4 py-2 max-w-xs truncate">{mistake.whatWentWrong}</td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={mistake.reviewed}
                      onChange={() => toggleReviewed(mistake.id, mistake.reviewed)}
                      className="cursor-pointer"
                    />
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
