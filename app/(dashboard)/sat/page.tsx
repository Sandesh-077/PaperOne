"use client";

import { useEffect, useState } from "react";

type SATSession = {
  id: string;
  date: string;
  duration: number;
  topicsCovered: string;
  videoId: string | null;
  timestamp: number | null;
  notes: string | null;
};

export default function SATPage() {
  const [sessions, setSessions] = useState<SATSession[]>([]);
  const [todaySessions, setTodaySessions] = useState<SATSession[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [todayHours, setTodayHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);

  const [formData, setFormData] = useState({
    duration: "",
    topicsCovered: "",
    videoUrl: "",
    timestamp: "",
    notes: "",
  });

  useEffect(() => {
    fetchSessions();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sat-sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        
        // Calculate accurate total hours
        const totalMinutes = data.reduce((acc: number, s: SATSession) => acc + s.duration, 0);
        setTotalHours(Math.round((totalMinutes / 60) * 10) / 10);
        
        // Get today's sessions
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayData = data.filter((s: SATSession) => {
          const sessionDate = new Date(s.date);
          sessionDate.setHours(0, 0, 0, 0);
          return sessionDate.getTime() === today.getTime();
        });
        setTodaySessions(todayData);
        
        // Calculate today's hours
        const todayMinutes = todayData.reduce((acc: number, s: SATSession) => acc + s.duration, 0);
        setTodayHours(Math.round((todayMinutes / 60) * 10) / 10);
        
        // Load last video if available
        const lastSession = data[0];
        if (lastSession?.videoId) {
          setCurrentVideo(lastSession.videoId);
          setCurrentTimestamp(lastSession.timestamp || 0);
        }
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setStreak(data.streaks.sat || 0);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const extractVideoId = (url: string): string | null => {
    if (!url) return null;
    
    // Already a video ID
    if (url.length === 11 && !url.includes("/") && !url.includes(".")) {
      return url;
    }

    // Standard: https://www.youtube.com/watch?v=VIDEO_ID
    const standardMatch = url.match(/[?&]v=([^&]+)/);
    if (standardMatch) return standardMatch[1];

    // Short: https://youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([^?]+)/);
    if (shortMatch) return shortMatch[1];

    // Embed: https://www.youtube.com/embed/VIDEO_ID
    const embedMatch = url.match(/embed\/([^?]+)/);
    if (embedMatch) return embedMatch[1];

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.duration || !formData.topicsCovered) {
      alert("Please fill in required fields");
      return;
    }

    const videoId = extractVideoId(formData.videoUrl);

    try {
      const res = await fetch("/api/sat-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: parseInt(formData.duration),
          topicsCovered: formData.topicsCovered,
          videoId: videoId || undefined,
          timestamp: formData.timestamp ? parseInt(formData.timestamp) : undefined,
          notes: formData.notes || undefined,
        }),
      });

      if (res.ok) {
        setShowForm(false);
        setFormData({ duration: "", topicsCovered: "", videoUrl: "", timestamp: "", notes: "" });
        fetchSessions();
        fetchStats();
        
        // Update current video if new one provided
        if (videoId) {
          setCurrentVideo(videoId);
          setCurrentTimestamp(parseInt(formData.timestamp) || 0);
        }
      } else {
        alert("Failed to create session");
      }
    } catch (error) {
      console.error("Failed to create session:", error);
      alert("Failed to create session");
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;

    try {
      const res = await fetch(`/api/sat-sessions/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchSessions();
        fetchStats();
      } else {
        alert("Failed to delete session");
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      alert("Failed to delete session");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getResumeTime = (timestamp: number) => {
    // Resume 10 seconds before saved timestamp for context
    const resumeTime = Math.max(0, timestamp - 10);
    return resumeTime;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SAT Preparation</h1>
          <p className="text-gray-600 mt-1">Track your SAT study sessions</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {showForm ? "Cancel" : "📝 Log Session"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
          <div className="text-sm font-medium mb-2">SAT Study Streak</div>
          <div className="text-4xl font-bold mb-1">{streak} days 🔥</div>
          <div className="text-sm opacity-90">Keep going!</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg p-6 shadow-lg">
          <div className="text-sm font-medium mb-2">Today&apos;s Study Time</div>
          <div className="text-4xl font-bold mb-1">{todayHours}h ⏱️</div>
          <div className="text-sm opacity-90">{todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''} today</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-lg p-6 shadow-lg">
          <div className="text-sm font-medium mb-2">Total Study Time</div>
          <div className="text-4xl font-bold mb-1">{totalHours}h 📊</div>
          <div className="text-sm opacity-90">{sessions.length} total session{sessions.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* YouTube Video Player */}
      {currentVideo && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Continue Watching</h2>
            <a
              href={`https://www.youtube.com/watch?v=${currentVideo}&t=${getResumeTime(currentTimestamp)}s`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Open in YouTube →
            </a>
          </div>
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              src={`https://www.youtube.com/embed/${currentVideo}?start=${getResumeTime(currentTimestamp)}`}
              title="SAT Study Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <p className="text-sm text-gray-600 mt-3">
            ⏰ Resuming from {Math.floor(currentTimestamp / 60)}:{(currentTimestamp % 60).toString().padStart(2, "0")} 
            (starting 10 seconds earlier for context)
          </p>
        </div>
      )}

      {/* Log Session Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Log Study Session</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="e.g., 45"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Topics Covered *
                </label>
                <input
                  type="text"
                  value={formData.topicsCovered}
                  onChange={(e) => setFormData({ ...formData, topicsCovered: e.target.value })}
                  placeholder="e.g., Algebra, Reading"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                YouTube Video URL or ID (optional)
              </label>
              <input
                type="text"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Paste full URL or just the video ID (11 characters)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timestamp (seconds) - Where you stopped
              </label>
              <input
                type="number"
                value={formData.timestamp}
                onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                placeholder="e.g., 300 (for 5:00)"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">
                Next time will resume 10 seconds earlier
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="What did you learn? Any challenges?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Save Session
            </button>
          </form>
        </div>
      )}

      {/* Today's Sessions */}
      {todaySessions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Today&apos;s Sessions</h2>
          <div className="space-y-3">
            {todaySessions.map((session) => (
              <div
                key={session.id}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-indigo-900 text-lg">{session.topicsCovered}</span>
                      <span className="text-sm text-gray-700">• {formatDuration(session.duration)}</span>
                      <span className="text-sm text-gray-600">• {formatDate(session.date)}</span>
                    </div>
                    
                    {session.videoId && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-700">🎥 Video:</span>
                        <a
                          href={`https://www.youtube.com/watch?v=${session.videoId}${session.timestamp ? `&t=${getResumeTime(session.timestamp)}s` : ""}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Watch on YouTube
                        </a>
                        {session.timestamp && (
                          <span className="text-xs text-gray-600">
                            (from {Math.floor(session.timestamp / 60)}:{(session.timestamp % 60).toString().padStart(2, "0")})
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setCurrentVideo(session.videoId);
                            setCurrentTimestamp(session.timestamp || 0);
                          }}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium ml-2"
                        >
                          ▶ Play above
                        </button>
                      </div>
                    )}
                    
                    {session.notes && (
                      <p className="text-sm text-gray-700 italic mt-2">&ldquo;{session.notes}&rdquo;</p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded transition-colors"
                    title="Delete session"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session History */}
      {sessions.length > 0 ? (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Study History</h2>
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-gray-900">{session.topicsCovered}</span>
                      <span className="text-sm text-gray-600">• {formatDuration(session.duration)}</span>
                      <span className="text-sm text-gray-500">• {formatDate(session.date)}</span>
                    </div>
                    
                    {session.videoId && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-600">🎥 Video:</span>
                        <a
                          href={`https://www.youtube.com/watch?v=${session.videoId}${session.timestamp ? `&t=${getResumeTime(session.timestamp)}s` : ""}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          Watch on YouTube
                        </a>
                        {session.timestamp && (
                          <span className="text-xs text-gray-500">
                            (from {Math.floor(session.timestamp / 60)}:{(session.timestamp % 60).toString().padStart(2, "0")})
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setCurrentVideo(session.videoId);
                            setCurrentTimestamp(session.timestamp || 0);
                          }}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium ml-2"
                        >
                          ▶ Play above
                        </button>
                      </div>
                    )}
                    
                    {session.notes && (
                      <p className="text-sm text-gray-600 italic mt-2">&ldquo;{session.notes}&rdquo;</p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded transition-colors"
                    title="Delete session"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No study sessions yet</h3>
          <p className="text-gray-600 mb-4">Log your first SAT study session to start tracking!</p>
        </div>
      )}
    </div>
  );
}
