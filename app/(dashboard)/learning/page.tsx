"use client";

import { useEffect, useState } from "react";

type LearningProject = {
  id: string;
  name: string;
  description: string | null;
  totalUnits: number;
  completedUnits: number;
  daysSpent: number;
  lastStudied: string | null;
  progressPercentage: number;
  sessions: Array<{
    id: string;
    date: string;
    unitsCompleted: number;
    notes: string | null;
  }>;
  createdAt: string;
};

export default function LearningPage() {
  const [projects, setProjects] = useState<LearningProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState<string | null>(null);

  const [projectForm, setProjectForm] = useState({
    name: "",
    description: "",
    totalUnits: "",
  });

  const [sessionForm, setSessionForm] = useState({
    unitsCompleted: "",
    notes: "",
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/learning-projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectForm.name || !projectForm.totalUnits) {
      alert("Please fill in required fields");
      return;
    }

    try {
      const res = await fetch("/api/learning-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...projectForm,
          totalUnits: parseInt(projectForm.totalUnits),
        }),
      });

      if (res.ok) {
        setShowProjectForm(false);
        setProjectForm({ name: "", description: "", totalUnits: "" });
        fetchProjects();
      } else {
        alert("Failed to create project");
      }
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("Failed to create project");
    }
  };

  const handleSessionSubmit = async (e: React.FormEvent, projectId: string) => {
    e.preventDefault();

    if (!sessionForm.unitsCompleted) {
      alert("Please enter units completed");
      return;
    }

    try {
      const res = await fetch("/api/learning-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          unitsCompleted: parseInt(sessionForm.unitsCompleted),
          notes: sessionForm.notes || undefined,
        }),
      });

      if (res.ok) {
        setShowSessionForm(null);
        setSessionForm({ unitsCompleted: "", notes: "" });
        fetchProjects();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to log session");
      }
    } catch (error) {
      console.error("Failed to log session:", error);
      alert("Failed to log session");
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const res = await fetch(`/api/learning-projects/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchProjects();
      } else {
        alert("Failed to delete project");
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert("Failed to delete project");
    }
  };

  const getDaysAgo = (dateString: string | null) => {
    if (!dateString) return "Never";
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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
          <h1 className="text-3xl font-bold text-gray-900">Learning Projects</h1>
          <p className="text-gray-600 mt-1">Track your self-learning journeys</p>
        </div>
        <button
          onClick={() => setShowProjectForm(!showProjectForm)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          {showProjectForm ? "Cancel" : "+ New Project"}
        </button>
      </div>

      {showProjectForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Create Learning Project</h2>
          <form onSubmit={handleProjectSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                placeholder="e.g., SAT Math Prep, German A1, Web Development"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="What are you learning and why?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Units *
              </label>
              <input
                type="number"
                value={projectForm.totalUnits}
                onChange={(e) => setProjectForm({ ...projectForm, totalUnits: e.target.value })}
                placeholder="e.g., 50 (chapters, modules, lessons, etc.)"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-500 mt-1">Units can be chapters, modules, lessons, practice sets, etc.</p>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Create Project
            </button>
          </form>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚀</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No learning projects yet</h3>
          <p className="text-gray-600 mb-4">Start a new learning journey today!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{project.name}</h3>
                    {project.description && (
                      <p className="text-gray-600 mb-3">{project.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>📚 {project.completedUnits} / {project.totalUnits} units</span>
                      <span>⏱️ {project.daysSpent} days spent</span>
                      <span>🕐 Last studied: {getDaysAgo(project.lastStudied)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded transition-colors"
                    title="Delete project"
                  >
                    🗑️
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span className="font-semibold text-purple-600">{project.progressPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${project.progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Log Session Button */}
                <button
                  onClick={() => setShowSessionForm(showSessionForm === project.id ? null : project.id)}
                  className="w-full px-4 py-2 bg-purple-50 text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-100 transition-colors font-medium mb-4"
                >
                  {showSessionForm === project.id ? "Cancel" : "📝 Log Study Session"}
                </button>

                {/* Session Form */}
                {showSessionForm === project.id && (
                  <form
                    onSubmit={(e) => handleSessionSubmit(e, project.id)}
                    className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4"
                  >
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Units Completed Today *
                        </label>
                        <input
                          type="number"
                          value={sessionForm.unitsCompleted}
                          onChange={(e) => setSessionForm({ ...sessionForm, unitsCompleted: e.target.value })}
                          placeholder="e.g., 2"
                          min="1"
                          max={project.totalUnits - project.completedUnits}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Remaining: {project.totalUnits - project.completedUnits} units
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes (optional)
                        </label>
                        <textarea
                          value={sessionForm.notes}
                          onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                          placeholder="What did you learn today?"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                      >
                        Save Session
                      </button>
                    </div>
                  </form>
                )}

                {/* Recent Sessions */}
                {project.sessions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Sessions</h4>
                    <div className="space-y-2">
                      {project.sessions.map((session) => (
                        <div
                          key={session.id}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-medium text-gray-900">
                                {session.unitsCompleted} {session.unitsCompleted === 1 ? "unit" : "units"}
                              </span>
                              <span className="text-gray-600 ml-2">• {formatDate(session.date)}</span>
                            </div>
                          </div>
                          {session.notes && (
                            <p className="text-gray-600 mt-1 italic">&ldquo;{session.notes}&rdquo;</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
