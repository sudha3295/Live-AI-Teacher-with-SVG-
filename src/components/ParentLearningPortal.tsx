import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Play,
  RotateCcw,
  Trash2,
  X,
  Eye,
  Download,
  Share2,
  Printer,
  ChevronDown,
  ChevronUp,
  Brain,
  Award,
  Layers,
  GraduationCap,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { LearningSession, TimelineMilestone, SessionVisual } from '../types';

interface ParentLearningPortalProps {
  isOpen: boolean;
  onClose: () => void;
  onResumeSession: (session: LearningSession) => void;
  targetClass: string;
}

export const ParentLearningPortal: React.FC<ParentLearningPortalProps> = ({
  isOpen,
  onClose,
  onResumeSession,
  targetClass,
}) => {
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSession, setSelectedSession] = useState<LearningSession | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'visuals' | 'memory'>('timeline');
  const [viewingSvg, setViewingSvg] = useState<{ topic: string; svgMarkup: string } | null>(null);
  const [viewingTranscriptSession, setViewingTranscriptSession] =
    useState<LearningSession | null>(null);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      if (data.sessions && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        if (data.sessions.length > 0 && !selectedSession) {
          setSelectedSession(data.sessions[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load learning sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedSessionIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this session from the timeline?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (selectedSession?.id === id) {
        setSelectedSession(null);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadSvg = (topic: string, svgMarkup: string) => {
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic.replace(/\s+/g, '-').toLowerCase()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Aggregated Stats
  const totalMinutes = Math.round(
    sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0) / 60
  );
  const allVisuals: { sessionTitle: string; visual: SessionVisual }[] = [];
  sessions.forEach((s) => {
    (s.visuals || []).forEach((v) => {
      allVisuals.push({ sessionTitle: s.title, visual: v });
    });
  });

  const latestSession = sessions[0] || null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white border border-neutral-300 rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-xs shrink-0 select-none">
              🐘
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900">
                  Truncky AI — Parent Learning Dashboard & Timeline
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  Kids Companion + Teacher AI
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  {targetClass}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Track learning milestones, review generated educational diagrams, and see where Truncky continues
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-100 transition-colors"
              title="Print learning summary report"
            >
              <Printer className="h-3.5 w-3.5 text-neutral-500" />
              <span>Print Report</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 rounded-md transition-colors"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-5 py-3.5 bg-neutral-100/70 border-b border-neutral-200 text-xs">
          <div className="bg-white p-2.5 rounded-lg border border-neutral-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-indigo-600" /> Completed Lessons
            </span>
            <p className="mt-1 font-bold text-sm text-neutral-900">
              {sessions.length} {sessions.length === 1 ? 'Session' : 'Sessions'}
            </p>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-neutral-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1">
              <Clock className="h-3 w-3 text-emerald-600" /> Learning Time
            </span>
            <p className="mt-1 font-bold text-sm text-neutral-900">
              {totalMinutes} {totalMinutes === 1 ? 'Minute' : 'Minutes'}
            </p>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-neutral-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1">
              <Layers className="h-3 w-3 text-amber-600" /> Visual Diagrams
            </span>
            <p className="mt-1 font-bold text-sm text-neutral-900">
              {allVisuals.length} Illustrations
            </p>
          </div>

          <div className="bg-white p-2.5 rounded-lg border border-neutral-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1">
              <Brain className="h-3 w-3 text-purple-600" /> AI Memory State
            </span>
            <p className="mt-1 font-bold text-xs text-purple-900 truncate" title={latestSession?.title || 'Ready'}>
              {latestSession ? `Ready: ${latestSession.title.slice(0, 18)}...` : 'No history yet'}
            </p>
          </div>
        </div>

        {/* View Tabs */}
        <div className="px-5 border-b border-neutral-200 bg-white flex items-center gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`py-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Learning Timeline ({sessions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('visuals')}
            className={`py-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'visuals'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Visual Gallery ({allVisuals.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('memory')}
            className={`py-3 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'memory'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            <span>AI Continuity & Resume Memory</span>
          </button>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto p-5 bg-neutral-50/50">
          {loading ? (
            <div className="py-16 text-center text-neutral-400">
              <div className="inline-block h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs">Loading learning history...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-16 text-center max-w-md mx-auto text-neutral-500 space-y-2">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full inline-block">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-neutral-800">No Learning Sessions Saved Yet</h3>
              <p className="text-xs text-neutral-600">
                When your child finishes a lesson with the AI teacher, click <strong>Save Lesson</strong> in the conversation panel to record their timeline and save where the teacher left off.
              </p>
            </div>
          ) : activeTab === 'timeline' ? (
            /* TAB 1: Chronological Timeline */
            <div className="space-y-6">
              {sessions.map((session, index) => {
                const isExpanded = expandedSessionIds[session.id] ?? (index === 0);
                const sessionDate = new Date(session.startedAt).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const sessionTime = new Date(session.startedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const durationMins = Math.max(1, Math.round(session.durationSeconds / 60));

                return (
                  <div
                    key={session.id}
                    className="relative bg-white border border-neutral-300 rounded-xl shadow-xs overflow-hidden transition-all hover:border-neutral-400"
                  >
                    {/* Session Card Header */}
                    <div
                      onClick={() => toggleExpand(session.id)}
                      className="p-4 cursor-pointer bg-white hover:bg-neutral-50/60 transition-colors flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-[280px]">
                        <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-neutral-900">{session.title}</h3>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-200">
                              {session.targetClass}
                            </span>
                            {index === 0 && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Latest Lesson
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-neutral-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-neutral-400" />
                              {sessionDate} at {sessionTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-neutral-400" />
                              {durationMins} min
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 text-neutral-400" />
                              {session.transcript?.length || 0} messages
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Top Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onResumeSession(session);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
                          title="Resume AI conversation from this lesson"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>Resume Lesson</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingTranscriptSession(session);
                          }}
                          className="px-2.5 py-1.5 text-xs text-neutral-700 hover:bg-neutral-200/80 rounded border border-neutral-300 transition-colors"
                          title="Read full conversation transcript"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          disabled={deletingId === session.id}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete session"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>

                        <div className="text-neutral-400 p-1">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-neutral-200 bg-neutral-50/40 space-y-4 text-xs">
                        {/* Parent Summary */}
                        <div className="bg-white p-3.5 rounded-lg border border-neutral-200 shadow-2xs">
                          <span className="font-bold text-neutral-900 block mb-1">
                            Summary for Parents
                          </span>
                          <p className="text-neutral-700 leading-relaxed">{session.summary}</p>
                        </div>

                        {/* What was learned */}
                        {session.keyLearnings && session.keyLearnings.length > 0 && (
                          <div className="bg-white p-3.5 rounded-lg border border-neutral-200 shadow-2xs">
                            <span className="font-bold text-neutral-900 block mb-2 flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              Key Concepts Mastered
                            </span>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-700">
                              {session.keyLearnings.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 bg-neutral-50 p-2 rounded">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Timeline Milestones (Visual Step-by-Step) */}
                        {session.timeline && session.timeline.length > 0 && (
                          <div className="bg-white p-3.5 rounded-lg border border-neutral-200 shadow-2xs">
                            <span className="font-bold text-neutral-900 block mb-3 flex items-center gap-1.5">
                              <Clock className="h-4 w-4 text-indigo-600" />
                              Step-by-Step Learning Timeline
                            </span>
                            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
                              {session.timeline.map((mile, mIdx) => (
                                <div key={mile.id || mIdx} className="relative group">
                                  <div
                                    className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs ${
                                      mile.type === 'visual'
                                        ? 'bg-amber-500'
                                        : mile.type === 'question'
                                        ? 'bg-indigo-600'
                                        : 'bg-emerald-500'
                                    }`}
                                  />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-neutral-900">{mile.title}</span>
                                      <span className="text-[10px] font-mono text-neutral-400 capitalize">
                                        {mile.type}
                                      </span>
                                    </div>
                                    <p className="text-neutral-600 mt-0.5">{mile.description}</p>
                                    {mile.childQuestion && (
                                      <div className="mt-1.5 p-2 bg-indigo-50/70 border border-indigo-200 rounded text-[11px] text-indigo-900">
                                        <span className="font-semibold">Child asked: </span>
                                        "{mile.childQuestion}"
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Where Conversation Left Off (AI Memory) */}
                        <div className="bg-purple-50/70 border border-purple-200 p-3.5 rounded-lg flex items-start gap-3">
                          <Brain className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-bold text-purple-950 block">
                              Where the Conversation Left Off (AI Continuation Point)
                            </span>
                            <p className="text-purple-900 mt-1 leading-relaxed">
                              {session.resumeContext}
                            </p>
                            <div className="mt-2.5 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onResumeSession(session);
                                  onClose();
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-700 text-white rounded text-xs font-semibold hover:bg-purple-800 transition-colors cursor-pointer"
                              >
                                <Play className="h-3 w-3 fill-current" />
                                <span>Pick Up Lesson Here</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Visuals Generated in this Session */}
                        {session.visuals && session.visuals.length > 0 && (
                          <div className="bg-white p-3.5 rounded-lg border border-neutral-200">
                            <span className="font-bold text-neutral-900 block mb-2">
                              Visual Diagrams Generated ({session.visuals.length})
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {session.visuals.map((v, vIdx) => (
                                <div
                                  key={v.callId || vIdx}
                                  className="border border-neutral-200 rounded-lg p-2 bg-neutral-50/60 hover:bg-white transition-colors cursor-pointer group"
                                  onClick={() => setViewingSvg({ topic: v.topic, svgMarkup: v.svgMarkup })}
                                >
                                  <div
                                    className="h-28 w-full bg-white rounded border border-neutral-200 flex items-center justify-center p-1.5 overflow-hidden [&>svg]:max-w-full [&>svg]:max-h-full"
                                    dangerouslySetInnerHTML={{ __html: v.svgMarkup }}
                                  />
                                  <p className="mt-1.5 text-[11px] font-bold text-neutral-800 truncate">
                                    {v.topic}
                                  </p>
                                  <div className="flex items-center justify-between mt-1 text-[10px] text-indigo-600 font-medium">
                                    <span>Click to view</span>
                                    <Eye className="h-3 w-3" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'visuals' ? (
            /* TAB 2: Visual Illustrations Gallery */
            <div>
              {allVisuals.length === 0 ? (
                <div className="py-16 text-center text-neutral-500">
                  <Layers className="h-8 w-8 mx-auto text-neutral-300 mb-2" />
                  <p className="text-sm font-semibold">No visual diagrams saved yet</p>
                  <p className="text-xs text-neutral-400">
                    When the AI teacher illustrates concepts with the SVG Creator tool, diagrams will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allVisuals.map(({ sessionTitle, visual }, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-neutral-300 rounded-xl p-3 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div
                          className="h-44 w-full bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-center p-2 overflow-hidden cursor-pointer [&>svg]:max-w-full [&>svg]:max-h-full"
                          onClick={() => setViewingSvg({ topic: visual.topic, svgMarkup: visual.svgMarkup })}
                          dangerouslySetInnerHTML={{ __html: visual.svgMarkup }}
                        />
                        <h4 className="mt-2.5 text-xs font-bold text-neutral-900 truncate">
                          {visual.topic}
                        </h4>
                        <p className="text-[10px] text-neutral-500 truncate">From: {sessionTitle}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => setViewingSvg({ topic: visual.topic, svgMarkup: visual.svgMarkup })}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium text-[11px]"
                        >
                          <Eye className="h-3 w-3" />
                          <span>View Full</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDownloadSvg(visual.topic, visual.svgMarkup)}
                          className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900 text-[11px]"
                          title="Download SVG"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* TAB 3: AI Continuity & Resume Memory */
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-700" />
                  <h3 className="text-sm font-bold text-purple-950">How AI Session Continuity Works</h3>
                </div>
                <p className="text-xs text-purple-900 leading-relaxed">
                  Every time your child completes a lesson, the AI synthesizes a learning memory profile. When your child reconnects, this learning context is loaded into the teacher so the AI warmly welcomes them back, references what they mastered, and picks up right where they left off without restarting from scratch.
                </p>
              </div>

              {latestSession ? (
                <div className="bg-white border border-neutral-300 rounded-xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                      Active AI Teacher Memory
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Loaded & Ready
                    </span>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs space-y-2">
                    <div>
                      <span className="font-semibold text-neutral-600">Most Recent Topic:</span>{' '}
                      <span className="font-bold text-neutral-900">{latestSession.title}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-neutral-600">Where AI Left Off:</span>
                      <p className="text-neutral-800 mt-0.5 italic bg-white p-2.5 rounded border border-neutral-200">
                        "{latestSession.resumeContext}"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-neutral-500">
                      Start your next session now and the teacher will automatically resume this thread.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onResumeSession(latestSession);
                        onClose();
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Start Resumed Session</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-400">
                  <p className="text-xs">Complete a lesson first to activate AI memory.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs text-neutral-500">
          <span>Parent learning history is stored securely and updated after each lesson.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-neutral-900 text-white rounded text-xs font-semibold hover:bg-neutral-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* SVG Detail Modal */}
      {viewingSvg && (
        <div className="fixed inset-0 z-60 bg-neutral-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <h3 className="text-sm font-bold text-neutral-900">{viewingSvg.topic}</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSvg(viewingSvg.topic, viewingSvg.svgMarkup)}
                  className="px-2.5 py-1 text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded inline-flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  <span>Download SVG</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingSvg(null)}
                  className="p-1 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div
              className="h-80 w-full flex items-center justify-center p-4 bg-neutral-50 rounded border border-neutral-200 overflow-hidden [&>svg]:max-w-full [&>svg]:max-h-full"
              dangerouslySetInnerHTML={{ __html: viewingSvg.svgMarkup }}
            />
          </div>
        </div>
      )}

      {/* Full Transcript Viewer Modal */}
      {viewingTranscriptSession && (
        <div className="fixed inset-0 z-60 bg-neutral-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  Dialogue Transcript: {viewingTranscriptSession.title}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {viewingTranscriptSession.transcript?.length || 0} messages exchanged
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingTranscriptSession(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-neutral-50/50 text-xs">
              {viewingTranscriptSession.transcript?.map((msg, i) => (
                <div
                  key={msg.id || i}
                  className={`p-3 rounded-lg ${
                    msg.role === 'student'
                      ? 'bg-blue-600 text-white ml-8 rounded-tr-none'
                      : msg.role === 'teacher'
                      ? 'bg-white text-neutral-900 border border-neutral-200 mr-8 rounded-tl-none'
                      : 'bg-neutral-100 text-neutral-600 text-[11px] text-center'
                  }`}
                >
                  <div className="text-[10px] font-bold opacity-75 uppercase mb-1">
                    {msg.role === 'student' ? 'Child' : msg.role === 'teacher' ? 'Teacher' : 'Notice'}
                  </div>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-neutral-200 bg-white flex justify-end">
              <button
                type="button"
                onClick={() => setViewingTranscriptSession(null)}
                className="px-3 py-1 bg-neutral-900 text-white rounded text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
