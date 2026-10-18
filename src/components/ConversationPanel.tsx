import React, { useRef, useEffect, useState } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  RotateCcw,
  Sparkles,
  User,
  GraduationCap,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  BookmarkPlus,
  BookOpen,
  Brain,
  Check,
} from 'lucide-react';
import { ChatMessage } from '../types';

interface ConversationPanelProps {
  messages: ChatMessage[];
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  isMicActive: boolean;
  isMuted: boolean;
  onToggleConnect: () => void;
  onToggleMic: () => void;
  onToggleMute: () => void;
  onSendMessage: (text: string) => void;
  onClearSession: () => void;
  activeModelName: string;
  onSaveCurrentSession?: () => void;
  isSavingSession?: boolean;
  onOpenParentPortal?: () => void;
  resumeNotice?: string | null;
  resumedFromTitle?: string | null;
  savedSessionCount?: number;
  onResetResumeMemory?: () => void;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  messages,
  connectionStatus,
  isMicActive,
  isMuted,
  onToggleConnect,
  onToggleMic,
  onToggleMute,
  onSendMessage,
  onClearSession,
  activeModelName,
  onSaveCurrentSession,
  isSavingSession = false,
  onOpenParentPortal,
  resumeNotice,
  resumedFromTitle,
  savedSessionCount = 0,
  onResetResumeMemory,
}) => {
  const [inputText, setInputText] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleSave = () => {
    if (onSaveCurrentSession) {
      onSaveCurrentSession();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Connected
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Loader2 className="h-3 w-3 animate-spin" />
            Connecting...
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="h-3 w-3" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-300">
            <span className="h-2 w-2 rounded-full bg-neutral-400" />
            Disconnected
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-neutral-300 rounded-lg shadow-xs overflow-hidden">
      {/* Panel Header & Controls */}
      <div className="shrink-0 p-3.5 sm:p-4 border-b border-neutral-200 bg-neutral-50/80">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs text-lg select-none">
              🐘
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-neutral-900 leading-tight">
                  Truncky AI
                </h2>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  Kids Companion + Teacher AI
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">{activeModelName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenParentPortal && (
              <button
                type="button"
                onClick={onOpenParentPortal}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                title="View what your child learned across sessions"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Parent Timeline</span>
                {savedSessionCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[10px]">
                    {savedSessionCount}
                  </span>
                )}
              </button>
            )}
            {getStatusBadge()}
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Connect / Disconnect */}
          <button
            type="button"
            onClick={onToggleConnect}
            className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-colors ${
              connectionStatus === 'connected'
                ? 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                : connectionStatus === 'connecting'
                ? 'bg-neutral-200 text-neutral-600 cursor-not-allowed border border-neutral-300'
                : 'bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-900'
            }`}
            disabled={connectionStatus === 'connecting'}
          >
            {connectionStatus === 'connected'
              ? 'Disconnect'
              : connectionStatus === 'connecting'
              ? 'Connecting...'
              : 'Start Live Lesson'}
          </button>

          {/* Microphone Toggle */}
          <button
            type="button"
            onClick={onToggleMic}
            disabled={connectionStatus !== 'connected'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
              connectionStatus !== 'connected'
                ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
                : isMicActive
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs animate-pulse'
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border-neutral-300'
            }`}
            title={isMicActive ? 'Stop Microphone' : 'Start Microphone'}
          >
            {isMicActive ? (
              <>
                <Mic className="h-3.5 w-3.5" />
                <span>Mic On</span>
              </>
            ) : (
              <>
                <MicOff className="h-3.5 w-3.5" />
                <span>Mic Off</span>
              </>
            )}
          </button>

          {/* Audio Mute Toggle */}
          <button
            type="button"
            onClick={onToggleMute}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
              isMuted
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-neutral-700 hover:bg-neutral-100 border-neutral-300'
            }`}
            title={isMuted ? 'Unmute Teacher Audio' : 'Mute Teacher Audio (Text continues)'}
          >
            {isMuted ? (
              <>
                <VolumeX className="h-3.5 w-3.5 text-amber-700" />
                <span>Audio Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5 text-neutral-600" />
                <span>Audio Active</span>
              </>
            )}
          </button>

          {/* Save Lesson to Timeline Button */}
          {messages.length > 0 && onSaveCurrentSession && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSavingSession}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded border transition-colors ${
                justSaved
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
              }`}
              title="Save this conversation to Parent Timeline & AI Memory"
            >
              {isSavingSession ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                  <span>Saving...</span>
                </>
              ) : justSaved ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="h-3 w-3" />
                  <span>Save Lesson</span>
                </>
              )}
            </button>
          )}

          {/* Clear Session */}
          <button
            type="button"
            onClick={onClearSession}
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded border border-transparent transition-colors"
            title="Clear transcript & restart session"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* AI Memory / Continuation Notice Banner */}
        {resumedFromTitle && (
          <div className="mt-2.5 pt-2 border-t border-neutral-200 flex items-center justify-between text-[11px] bg-purple-50/80 px-2.5 py-1.5 rounded border border-purple-200 text-purple-900">
            <span className="flex items-center gap-1.5 truncate">
              <Brain className="h-3.5 w-3.5 text-purple-600 shrink-0" />
              <span>
                <strong>AI Memory Active:</strong> Teacher remembers lesson on "
                <span className="font-semibold">{resumedFromTitle}</span>" and will pick up where you left off.
              </span>
            </span>
            {onResetResumeMemory && (
              <button
                type="button"
                onClick={onResetResumeMemory}
                className="ml-2 text-[10px] text-purple-700 underline hover:text-purple-900 shrink-0"
                title="Start a fresh conversation without previous topic memory"
              >
                Start Fresh
              </button>
            )}
          </div>
        )}
      </div>

      {/* Transcript Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-neutral-50/40 overscroll-contain"
      >
        {messages.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-neutral-500">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-full mb-3 text-3xl select-none">
              🐘
            </div>
            <h3 className="text-base font-bold text-neutral-900">
              Truncky is ready to learn and explore!
            </h3>
            <p className="text-xs text-neutral-600 max-w-sm mt-1">
              Your elephant companion is here. Click <strong>Start Live Lesson</strong> to speak with Truncky, ask questions, or discover new concepts together!
            </p>
            {resumedFromTitle && (
              <div className="mt-3 text-xs bg-purple-50 text-purple-900 px-3 py-1.5 rounded-full border border-purple-200 flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-purple-600" />
                <span>Ready to pick up from: <strong>{resumedFromTitle}</strong></span>
              </div>
            )}
            {onOpenParentPortal && savedSessionCount > 0 && (
              <button
                type="button"
                onClick={onOpenParentPortal}
                className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>View {savedSessionCount} past lesson timeline records</span>
              </button>
            )}
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.role === 'tool') {
              return (
                <div
                  key={msg.id}
                  className="mx-auto my-2 max-w-md p-2.5 bg-blue-50/90 border border-blue-200 rounded-md text-xs text-blue-900 flex items-start gap-2 shadow-2xs"
                >
                  <ImageIcon className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span>SVG Creator Tool Call</span>
                      <span className="text-[10px] text-blue-700 font-mono">
                        {msg.toolDetails?.status === 'running'
                          ? 'Generating drawing...'
                          : msg.toolDetails?.status === 'succeeded'
                          ? 'Drawing Rendered'
                          : 'Generation Failed'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-neutral-700 font-medium">{msg.text}</p>
                    {msg.toolDetails?.description && (
                      <p className="mt-1 text-[11px] text-neutral-500 font-mono line-clamp-2">
                        {msg.toolDetails.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            }

            if (msg.role === 'system') {
              return (
                <div
                  key={msg.id}
                  className="text-center my-1 text-[11px] text-neutral-500 font-mono"
                >
                  — {msg.text} —
                </div>
              );
            }

            const isStudent = msg.role === 'student';

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${
                  isStudent ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isStudent
                      ? 'bg-blue-600 text-white'
                      : 'bg-emerald-700 text-white'
                  }`}
                >
                  {isStudent ? <User className="h-3.5 w-3.5" /> : <GraduationCap className="h-4 w-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[82%] rounded-lg p-3 text-sm leading-relaxed shadow-2xs ${
                    isStudent
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white text-neutral-900 border border-neutral-200 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span
                      className={`text-[10px] font-semibold tracking-wide uppercase ${
                        isStudent ? 'text-blue-200' : 'text-emerald-800'
                      }`}
                    >
                      {isStudent ? 'Child / Student' : 'Teacher'}
                    </span>
                    <span
                      className={`text-[10px] ${
                        isStudent ? 'text-blue-200' : 'text-neutral-400'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {msg.isPartial && (
                    <span className="inline-block w-1.5 h-3.5 bg-emerald-600 animate-pulse ml-1 align-middle" />
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Text Input Footer */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 p-3 border-t border-neutral-200 bg-white flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            connectionStatus === 'connected'
              ? 'Type a question for your teacher (e.g., "What is photosynthesis?")...'
              : 'Connect to ask questions or talk to your teacher...'
          }
          className="flex-1 bg-neutral-50 border border-neutral-300 rounded px-3 py-2 text-sm text-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-700 focus:bg-white"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || connectionStatus !== 'connected'}
          className={`px-3.5 py-2 rounded text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
            !inputText.trim() || connectionStatus !== 'connected'
              ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
              : 'bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer shadow-xs'
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
