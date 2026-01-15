'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { getDailyTopics } from '@/lib/essay-topics'

interface Essay {
  id: string
  title: string
  prompt?: string
  content: string
  wordCount: number
  grade?: string
  notes?: string
  createdAt: string
}

export default function EssaysPage() {
  const router = useRouter()
  const { status } = useSession()
  const [essays, setEssays] = useState<Essay[]>([])
  const [loading, setLoading] = useState(true)
  const [dailyTopics, setDailyTopics] = useState<[string, string]>(['', ''])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchEssays()
      setDailyTopics(getDailyTopics())
    }
  }, [status, router])

  const fetchEssays = async () => {
    try {
      const response = await fetch('/api/essays')
      if (response.ok) {
        const data = await response.json()
        setEssays(data)
      }
    } catch (error) {
      console.error('Failed to fetch essays:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteEssay = async (id: string) => {
    if (!confirm('Are you sure you want to delete this essay?')) return
    
    try {
      await fetch(`/api/essays/${id}`, { method: 'DELETE' })
      fetchEssays()
    } catch (error) {
      console.error('Failed to delete essay:', error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Essays</h1>
          <p className="text-gray-600 mt-1">Daily writing practice for EGP success</p>
        </div>
        <Link
          href="/essays/new"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          + 

      {/* Daily Topic Suggestions */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📝</span>
          Today's Writing Topics
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href={`/essays/new?topic=${encodeURIComponent(dailyTopics[0])}`}
            className="bg-white p-4 rounded-lg border border-purple-300 hover:border-purple-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between">
              <p className="text-gray-800 font-medium group-hover:text-purple-700">{dailyTopics[0]}</p>
              <span className="text-purple-600 ml-2">→</span>
            </div>
          </Link>
          <Link
            href={`/essays/new?topic=${encodeURIComponent(dailyTopics[1])}`}
            className="bg-white p-4 rounded-lg border border-blue-300 hover:border-blue-500 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between">
              <p className="text-gray-800 font-medium group-hover:text-blue-700">{dailyTopics[1]}</p>
              <span className="text-blue-600 ml-2">→</span>
            </div>
          </Link>
        </div>
        <Link
          href="/essays/new?custom=true"
          className="mt-4 block text-center text-purple-600 hover:text-purple-700 font-medium text-sm"
        >
          Or write on a custom topic →
        </Link>
      </div>Write Essay
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {essays.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500 mb-4">No essays yet. Start writing daily!</p>
            <Link
              href="/essays/new"
              className="inline-block bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Write Your First Essay
            </Link>
          </div>
        ) : (
          essays.map((essay) => (
            <div
              key={essay.id}
              className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{essay.title}</h3>
                {essay.grade && (
                  <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-sm font-bold rounded">
                    {essay.grade}
                  </span>
                )}
              </div>
              
              {essay.prompt && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">Prompt: {essay.prompt}</p>
              )}
              
              <p className="text-gray-700 text-sm line-clamp-3 mb-4">{essay.content}</p>
              
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-500">{essay.wordCount} words</span>
                <div className="flex gap-2">
                  <Link
                    href={`/essays/${essay.id}`}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => deleteEssay(essay.id)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
