'use client';

import { useState, useEffect } from 'react';

interface WritingFeedback {
  grammarScore: number;
  vocabularyScore: number;
  sentenceStructureScore: number;
  overallScore: number;
  aiFeedback: {
    grammarErrors: Array<{
      original: string;
      corrected: string;
      explanation: string;
      line?: number;
    }>;
    vocabularyAnalysis: Array<{
      word: string;
      usage: string;
      explanation: string;
    }>;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
  };
  wordsUsedCorrectly: string[];
  wordsUsedIncorrectly: string[];
  grammarAreasFound: string[];
  feedbackGeneratedAt?: string;
}

interface WritingPracticeEntry {
  id: string;
  title: string;
  prompt: string;
  studentWriting: string;
  difficulty: string;
  focusArea: string;
  grammarScore?: number;
  vocabularyScore?: number;
  sentenceStructureScore?: number;
  overallScore?: number;
  aiFeedback?: WritingFeedback['aiFeedback'];
  createdAt: string;
}

export default function WritingPracticePage() {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [writing, setWriting] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [focusArea, setFocusArea] = useState('balanced');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [writingId, setWritingId] = useState<string | null>(null);
  const [pastSubmissions, setPastSubmissions] = useState<WritingPracticeEntry[]>([]);
  const [view, setView] = useState<'new' | 'submissions'>('new');

  // Fetch past submissions
  useEffect(() => {
    const fetchPastSubmissions = async () => {
      try {
        const response = await fetch('/api/writing-practice');
        const data = await response.json();
        setPastSubmissions(data.submissions || []);
      } catch (error) {
        console.error('Error fetching submissions:', error);
      }
    };

    if (view === 'submissions') {
      fetchPastSubmissions();
    }
  }, [view]);

  const wordCount = writing.trim().split(/\s+/).filter(w => w.length > 0).length;
  const maxWords = 1000;
  const isOverLimit = wordCount > maxWords;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !writing.trim()) {
      alert('Please fill in title and writing content');
      return;
    }

    if (isOverLimit) {
      alert(`Writing exceeds ${maxWords} words. Please shorten it.`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/writing-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          prompt: prompt || 'General writing practice',
          studentWriting: writing,
          difficulty,
          focusArea,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setWritingId(data.id);
        setSubmitted(true);

        // Poll for feedback
        pollForFeedback(data.id);
      } else {
        alert('Error submitting writing');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error submitting writing');
    } finally {
      setLoading(false);
    }
  };

  const pollForFeedback = async (id: string) => {
    let attempts = 0;
    const maxAttempts = 30; // Poll for up to 1 minute

    const poll = async () => {
      try {
        const response = await fetch(`/api/writing-practice?id=${id}`);
        const data = await response.json();

        if (data.submission && data.submission.aiFeedback) {
          setFeedback({
            grammarScore: data.submission.grammarScore || 0,
            vocabularyScore: data.submission.vocabularyScore || 0,
            sentenceStructureScore: data.submission.sentenceStructureScore || 0,
            overallScore: data.submission.overallScore || 0,
            aiFeedback: data.submission.aiFeedback,
            wordsUsedCorrectly: data.submission.wordsUsedCorrectly || [],
            wordsUsedIncorrectly: data.submission.wordsUsedIncorrectly || [],
            grammarAreasFound: data.submission.grammarAreasFound || [],
            feedbackGeneratedAt: data.submission.feedbackGeneratedAt,
          });
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 2000); // Poll every 2 seconds
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    poll();
  };

  const handleReset = () => {
    setTitle('');
    setPrompt('');
    setWriting('');
    setDifficulty('intermediate');
    setFocusArea('balanced');
    setFeedback(null);
    setSubmitted(false);
    setWritingId(null);
  };

  const ScoreCard = ({ label, score }: { label: string; score: number }) => {
    const getColor = (score: number) => {
      if (score >= 8) return 'bg-green-50 border-green-200';
      if (score >= 6) return 'bg-yellow-50 border-yellow-200';
      return 'bg-red-50 border-red-200';
    };

    const getTextColor = (score: number) => {
      if (score >= 8) return 'text-green-700';
      if (score >= 6) return 'text-yellow-700';
      return 'text-red-700';
    };

    return (
      <div className={`rounded-lg border p-4 ${getColor(score)}`}>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className={`text-3xl font-bold ${getTextColor(score)}`}>{score.toFixed(1)}/10</p>
      </div>
    );
  };

  if (view === 'submissions') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => setView('new')}
            className="mb-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            ← Back to New Writing
          </button>

          <h1 className="text-4xl font-bold text-gray-800 mb-8">Past Submissions</h1>

          {pastSubmissions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <p className="text-gray-500 text-lg">No submissions yet. Start by writing your first piece!</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {pastSubmissions.map((submission) => (
                <div key={submission.id} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="mb-4">
                    <h3 className="text-2xl font-bold text-gray-800">{submission.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {submission.prompt && (
                    <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                      <p className="text-sm font-medium text-gray-600">Prompt:</p>
                      <p className="text-gray-700">{submission.prompt}</p>
                    </div>
                  )}

                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium text-gray-600 mb-2">Your Writing:</p>
                    <p className="text-gray-700 text-sm line-clamp-3">{submission.studentWriting}</p>
                  </div>

                  {submission.overallScore !== undefined && (
                    <div className="grid grid-cols-4 gap-3">
                      <ScoreCard label="Overall" score={submission.overallScore} />
                      <ScoreCard label="Grammar" score={submission.grammarScore || 0} />
                      <ScoreCard label="Vocabulary" score={submission.vocabularyScore || 0} />
                      <ScoreCard label="Structure" score={submission.sentenceStructureScore || 0} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Writing Practice</h1>
          <p className="text-gray-600">
            Improve your writing with AI-powered feedback on grammar, vocabulary, and structure
          </p>
          <button
            onClick={() => setView('submissions')}
            className="mt-4 px-4 py-2 text-indigo-600 hover:text-indigo-700 underline"
          >
            View Past Submissions →
          </button>
        </div>

        {!submitted ? (
          // Form
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., My Essay on Climate Change"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                >
                  <option value="easy">Easy</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Focus Area (Optional)</label>
              <select
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
              >
                <option value="balanced">Balanced (all areas)</option>
                <option value="grammar">Grammar Focus</option>
                <option value="vocabulary">Vocabulary Focus</option>
                <option value="structure">Structure & Organization Focus</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt (Optional) <span className="text-gray-500 text-xs">- Provide context</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Discuss the role of technology in education"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Your Writing <span className="text-red-500">*</span>
                </label>
                <span
                  className={`text-xs font-medium ${
                    isOverLimit ? 'text-red-600' : wordCount > maxWords * 0.9 ? 'text-yellow-600' : 'text-gray-500'
                  }`}
                >
                  {wordCount} / {maxWords} words
                </span>
              </div>
              <textarea
                value={writing}
                onChange={(e) => setWriting(e.target.value)}
                placeholder="Paste or type your writing here..."
                rows={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 resize-none font-mono text-sm"
                required
              />
              {isOverLimit && <p className="text-red-600 text-sm mt-2">⚠️ Writing exceeds {maxWords} words limit</p>}
            </div>

            <button
              type="submit"
              disabled={loading || isOverLimit}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Analyzing... (AI is scoring your writing)
                </span>
              ) : (
                'Submit for AI Feedback'
              )}
            </button>
          </form>
        ) : feedback ? (
          // Results
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
              {/* Score Cards */}
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Assessment</h2>
              <div className="grid grid-cols-4 gap-4 mb-8">
                <ScoreCard label="Overall" score={feedback.overallScore} />
                <ScoreCard label="Grammar" score={feedback.grammarScore} />
                <ScoreCard label="Vocabulary" score={feedback.vocabularyScore} />
                <ScoreCard label="Structure" score={feedback.sentenceStructureScore} />
              </div>

              {/* Grammar Issues */}
              {feedback.aiFeedback && feedback.aiFeedback.grammarErrors && feedback.aiFeedback.grammarErrors.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="text-red-600">⚠️</span> Grammar Issues Found
                  </h3>
                  <div className="space-y-3">
                    {feedback.aiFeedback.grammarErrors.map((error, idx) => (
                      <div key={idx} className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
                        <div className="flex gap-2 mb-2">
                          <span className="font-mono text-sm bg-white px-2 py-1 rounded border border-red-200">
                            {error.original}
                          </span>
                          <span>→</span>
                          <span className="font-mono text-sm bg-green-100 px-2 py-1 rounded border border-green-200">
                            {error.corrected}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm">{error.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vocabulary Analysis */}
              {feedback.aiFeedback && feedback.aiFeedback.vocabularyAnalysis && feedback.aiFeedback.vocabularyAnalysis.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📚 Vocabulary Analysis</h3>
                  <div className="space-y-3">
                    {feedback.aiFeedback.vocabularyAnalysis.map((item, idx) => (
                      <div key={idx} className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
                        <p className="font-semibold text-gray-800">{item.word}</p>
                        <p className="text-gray-600 text-sm mt-1">{item.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {feedback.aiFeedback && feedback.aiFeedback.strengths && feedback.aiFeedback.strengths.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">✅ Strengths</h3>
                  <ul className="space-y-2">
                    {feedback.aiFeedback.strengths.map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-green-600 font-bold">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {feedback.aiFeedback && feedback.aiFeedback.improvements && feedback.aiFeedback.improvements.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Next Steps</h3>
                  <ul className="space-y-2">
                    {feedback.aiFeedback.improvements.map((improvement, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <span className="text-yellow-600 font-bold">→</span>
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Grammar Areas to Focus */}
              {feedback && feedback.grammarAreasFound && Array.isArray(feedback.grammarAreasFound) && feedback.grammarAreasFound.length > 0 && (
                <div className="rounded-lg bg-orange-50 border border-orange-200 p-4 mt-8">
                  <p className="text-orange-900 font-semibold mb-2">
                    🎯 Areas to Focus On (Added to your Grammar Coach):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {feedback.grammarAreasFound.map((area, idx) => (
                      <span key={idx} className="bg-orange-200 text-orange-900 px-3 py-1 rounded-full text-sm">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleReset}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                Write Another Piece
              </button>
              <a
                href="/grammar-coach"
                className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition text-center"
              >
                Go to Grammar Coach
              </a>
            </div>
          </div>
        ) : (
          // Loading
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
            <p className="text-gray-600 font-semibold">Generating AI feedback...</p>
            <p className="text-gray-500 text-sm mt-2">This usually takes 10-30 seconds</p>
          </div>
        )}
      </div>
    </div>
  );
}
