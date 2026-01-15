'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface Subject {
  id: string
  name: string
  type: string
  level?: string
  color?: string
  topics: Array<{
    id: string
    name: string
    completed: boolean
    subtopics: Array<{
      id: string
      completed: boolean
    }>
  }>
  _count: {
    topics: number
    practicePapers: number
    notes: number
  }
}

export default function SubjectsPage() {
  const router = useRouter()
  const { status } = useSession()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'alevel',
    level: '',
    color: '#3B82F6'
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchSubjects()
    }
  }, [status, router])

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects')
      if (response.ok) {
        const data = await response.json()
        setSubjects(data)
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (response.ok) {
        setShowAddForm(false)
        setFormData({ name: '', type: 'alevel', level: '', color: '#3B82F6' })
        fetchSubjects()
      }
    } catch (error) {
      console.error('Failed to create subject:', error)
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      alevel: 'A-Level',
      sat: 'SAT',
      extra: 'Extra Learning'
    }
    return labels[type] || type
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading...</div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Subjects</h1>
          <p className="text-gray-600 mt-1">Manage your A-Level and other subjects</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Subject
        </button>
      </div>

      {/* Add Subject Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Subject</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Physics AS"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="alevel">A-Level</option>
                  <option value="sat">SAT</option>
                  <option value="extra">Extra Learning</option>
                </select>
              </div>
              {formData.type === 'alevel' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select level</option>
                    <option value="AS">AS</option>
                    <option value="A2">A2</option>
                    <option value="Paper 3">Paper 3</option>
                    <option value="Paper 4">Paper 4</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Subject
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subjects Grid */}
      {subjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">No subjects yet. Add your first subject to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(subject => {
            const completedTopics = subject.topics.filter(t => t.completed).length
            const totalSubtopics = subject.topics.reduce((sum, t) => sum + t.subtopics.length, 0)
            const completedSubtopics = subject.topics.reduce(
              (sum, t) => sum + t.subtopics.filter(s => s.completed).length,
              0
            )
            
            return (
              <Link
                key={subject.id}
                href={`/subjects/${subject.id}`}
                className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:border-blue-600 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: subject.color || '#3B82F6' }}
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                      <p className="text-xs text-gray-500">
                        {getTypeLabel(subject.type)}
                        {subject.level && ` • ${subject.level}`}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Topics:</span>
                    <span className="font-medium text-gray-900">
                      {completedTopics}/{subject._count.topics}
                    </span>
                  </div>
                  
                  {totalSubtopics > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtopics:</span>
                      <span className="font-medium text-gray-900">
                        {completedSubtopics}/{totalSubtopics}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Practice Papers:</span>
                    <span className="font-medium text-gray-900">{subject._count.practicePapers}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Notes:</span>
                    <span className="font-medium text-gray-900">{subject._count.notes}</span>
                  </div>
                </div>

                {subject._count.topics > 0 && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(completedTopics / subject._count.topics) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
