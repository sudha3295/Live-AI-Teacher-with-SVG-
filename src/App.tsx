/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen,
  Sparkles,
  LogIn,
  Globe,
  ChevronDown,
  LogOut,
  Edit3,
  User,
  Heart,
} from 'lucide-react';
import { ConversationPanel } from './components/ConversationPanel';
import { VisualPanel } from './components/VisualPanel';
import { SettingsSection } from './components/SettingsSection';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { ParentLearningPortal } from './components/ParentLearningPortal';
import { LandingPage } from './components/LandingPage';
import { KidOnboardingModal } from './components/KidOnboardingModal';
import { AudioRecorder, AudioPlayer } from './utils/audio';
import { DEFAULT_TEACHER_PROMPT, buildTeacherPrompt } from './utils/prompts';
import {
  auth,
  onAuthStateChanged,
  signOutUser,
  loadUserProfile,
  saveUserKidPreferences,
  saveSessionToFirestore,
} from './utils/firebase';
import {
  ChatMessage,
  ToolCallState,
  UsageMetrics,
  SessionConfig,
  ModalityDetail,
  SessionVisual,
  LearningSession,
  UserProfile,
} from './types';

const INITIAL_CONFIG: SessionConfig = {
  model: 'gemini-3.8-live',
  voice: 'Zephyr',
  targetClass: 'Class 2',
  selectedLanguages: ['English'],
  systemPrompt: buildTeacherPrompt({
    selectedLanguages: ['English'],
    targetClass: 'Class 2',
  }),
  prefixPaddingMs: 300,
  silenceDurationMs: 500,
  maxOutputTokens: 8192,
};

const INITIAL_TOOL_STATE: ToolCallState = {
  status: 'idle',
  name: 'svg_creator',
  callId: '',
  args: { topic: '', description: '' },
  svgMarkup: null,
  rawText: null,
  error: null,
  durationMs: null,
  usageMetadata: null,
  timestamp: Date.now(),
};

// Helper to merge incoming transcription tokens/chunks cleanly without truncating or repeating
function mergeTranscriptChunk(currentAccumulated: string, incoming: string): string {
  const cur = (currentAccumulated || '').trim();
  const inc = (incoming || '').trim();
  if (!cur) return incoming || '';
  if (!inc) return currentAccumulated || '';

  // If incoming already starts with current (full accumulated phrase sent)
  if (incoming.startsWith(currentAccumulated)) {
    return incoming;
  }
  // If current already starts with incoming (prefix or redundant snapshot)
  if (currentAccumulated.startsWith(incoming)) {
    return currentAccumulated;
  }
  // If incoming contains current as substring
  if (incoming.includes(currentAccumulated)) {
    return incoming;
  }

  // Token / word append with proper whitespace
  const needsSpace =
    !currentAccumulated.endsWith(' ') &&
    !incoming.startsWith(' ') &&
    !/^[,.!?;:'")\]\}]/.test(incoming);
  return currentAccumulated + (needsSpace ? ' ' : '') + incoming;
}

export default function App() {
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>(INITIAL_CONFIG);
  const [effectiveConfig, setEffectiveConfig] = useState<SessionConfig | null>(null);

  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [latestSvg, setLatestSvg] = useState<string | null>(null);
  const [latestImage, setLatestImage] = useState<string | null>(null);
  const [toolCallState, setToolCallState] = useState<ToolCallState>(INITIAL_TOOL_STATE);

  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics>({});
  const [cumulativeTokens, setCumulativeTokens] = useState<number>(0);
  const [toolCallCount, setToolCallCount] = useState<number>(0);
  const [lastApiError, setLastApiError] = useState<string | null>(null);

  // Learning Session Tracking & Memory
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [sessionVisuals, setSessionVisuals] = useState<SessionVisual[]>([]);
  const [isParentPortalOpen, setIsParentPortalOpen] = useState<boolean>(false);
  const [savedSessionCount, setSavedSessionCount] = useState<number>(0);
  const [isSavingSession, setIsSavingSession] = useState<boolean>(false);
  const [activeResumeMemory, setActiveResumeMemory] = useState<{
    resumeContext?: string;
    resumedTitle?: string;
  } | null>(null);

  // User Profile & Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isKidOnboardingOpen, setIsKidOnboardingOpen] = useState<boolean>(false);

  // References to audio and websocket instances
  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const isMutedRef = useRef<boolean>(false);

  // Firebase Real Auth Listener: automatically restores session & Firestore user profile
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await loadUserProfile(firebaseUser.uid);
          if (!isMounted) return;
          if (profile) {
            setCurrentUser(profile);
            try {
              localStorage.setItem('truncky_current_user', JSON.stringify(profile));
            } catch {}
            if (profile.preferences) {
              const updatedPrompt = buildTeacherPrompt({
                selectedLanguages: profile.preferences.languages,
                targetClass: profile.preferences.targetClass,
                childName: profile.preferences.childName,
              });
              setSessionConfig((prev) => ({
                ...prev,
                targetClass: profile.preferences.targetClass || prev.targetClass,
                selectedLanguages: profile.preferences.languages || prev.selectedLanguages,
                systemPrompt: updatedPrompt,
              }));
            }
            const localOnboarded =
              localStorage.getItem(`truncky_onboarded_${profile.id}`) === 'true';
            const hasClassAndLang =
              !!profile.preferences?.targetClass &&
              profile.preferences.targetClass.trim() !== '' &&
              Array.isArray(profile.preferences?.languages) &&
              profile.preferences.languages.length > 0;
            const isCompleted = !!profile.onboardingCompleted || localOnboarded || hasClassAndLang;

            if (!isCompleted) {
              setIsKidOnboardingOpen(true);
            }
          }
        } catch (e) {
          console.warn('Failed to load profile on auth state change:', e);
        }
      } else {
        if (isMounted) {
          setCurrentUser(null);
          try {
            localStorage.removeItem('truncky_current_user');
          } catch {}
        }
      }
      if (isMounted) {
        setIsAuthChecking(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // User-isolated session fetcher: loads ONLY the active user's private learning journey
  const loadUserSessions = useCallback((userEmail?: string) => {
    const email = userEmail || 'guest';
    fetch('/api/sessions', {
      headers: {
        'x-user-email': email,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.sessions && Array.isArray(data.sessions)) {
          setSavedSessionCount(data.sessions.length);
          if (data.sessions[0]) {
            setActiveResumeMemory({
              resumedTitle: data.sessions[0].title,
              resumeContext: data.sessions[0].resumeContext,
            });
          } else {
            setActiveResumeMemory(null);
          }
        } else {
          setSavedSessionCount(0);
          setActiveResumeMemory(null);
        }
      })
      .catch((err) => console.warn('Could not fetch sessions for user:', err));
  }, []);

  // Automatically refresh sessions whenever the logged-in user changes (Sign in, Sign out, or initial mount)
  useEffect(() => {
    loadUserSessions(currentUser?.email);
  }, [currentUser?.email, loadUserSessions]);

  // Ensure AudioPlayer is initialized on user interaction
  const getAudioPlayer = useCallback(() => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new AudioPlayer();
      audioPlayerRef.current.setMuted(isMutedRef.current);
    }
    return audioPlayerRef.current;
  }, []);

  // Update muted ref & player
  useEffect(() => {
    isMutedRef.current = isMuted;
    if (audioPlayerRef.current) {
      audioPlayerRef.current.setMuted(isMuted);
    }
  }, [isMuted]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      audioRecorderRef.current?.stop();
      audioPlayerRef.current?.close();
      wsRef.current?.close();
    };
  }, []);

  const connectSession = useCallback(
    (
      configToUse: SessionConfig = sessionConfig,
      overrideResumeContext?: string,
      overrideResumedTitle?: string
    ) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      setConnectionStatus('connecting');
      setLastApiError(null);

      // Determine websocket protocol & url
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        const resumeContext =
          overrideResumeContext !== undefined
            ? overrideResumeContext === 'NONE'
              ? undefined
              : overrideResumeContext
            : activeResumeMemory?.resumeContext;

        const resumedTitle =
          overrideResumedTitle !== undefined
            ? overrideResumedTitle
            : activeResumeMemory?.resumedTitle;

        // Send start session configuration with AI memory context
        ws.send(
          JSON.stringify({
            type: 'start_session',
            userEmail: currentUser?.email || 'guest',
            model: configToUse.model,
            voice: configToUse.voice,
            targetClass: configToUse.targetClass,
            systemPrompt: configToUse.systemPrompt,
            prefixPaddingMs: configToUse.prefixPaddingMs,
            silenceDurationMs: configToUse.silenceDurationMs,
            maxOutputTokens: configToUse.maxOutputTokens,
            resumeContext: resumeContext || undefined,
            resumedTitle: resumedTitle || undefined,
            useResumeMemory: overrideResumeContext !== 'NONE',
            childName: currentUser?.preferences?.childName || undefined,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'session_status') {
            if (msg.status === 'connected') {
              setConnectionStatus('connected');
              if (!sessionStartTime) {
                setSessionStartTime(Date.now());
              }
              // By default, turn on microphone when live lesson connects
              startMicrophone(ws);
            } else if (msg.status === 'connecting') {
              setConnectionStatus('connecting');
              if (msg.effectiveConfig) {
                setEffectiveConfig(msg.effectiveConfig);
                if (msg.effectiveConfig.resumedFromSessionTitle) {
                  setActiveResumeMemory({
                    resumedTitle: msg.effectiveConfig.resumedFromSessionTitle,
                    resumeContext: msg.effectiveConfig.resumeNotice,
                  });
                }
              }
            } else if (msg.status === 'disconnected') {
              setConnectionStatus('disconnected');
              stopMicrophone();
            }
          } else if (msg.type === 'audio') {
            // Play 24kHz raw PCM chunk if not muted
            const player = getAudioPlayer();
            player.playChunk(msg.data);
          } else if (msg.type === 'transcript_teacher') {
            const turnId = (msg.turnId as string) || '';
            const incomingFullText = (msg.text as string) || '';
            const incomingDelta = (msg.delta as string) || '';
            const isFinished = !!msg.finished;

            setMessages((prev) => {
              // 1. If we have a turnId, update that specific teacher turn message
              if (turnId) {
                const existingIdx = prev.findIndex((m) => m.id === turnId);
                if (existingIdx !== -1) {
                  const existing = prev[existingIdx];
                  const updatedText = incomingFullText || mergeTranscriptChunk(existing.text, incomingDelta);
                  const updatedList = [...prev];
                  updatedList[existingIdx] = {
                    ...existing,
                    text: updatedText,
                    isPartial: !isFinished,
                    timestamp: Date.now(),
                  };
                  return updatedList;
                }
              }

              // 2. Otherwise update the last teacher message if still partial
              const lastIdx = prev.length - 1;
              const lastMsg = prev[lastIdx];
              if (lastMsg && lastMsg.role === 'teacher' && lastMsg.isPartial) {
                const updatedText = incomingFullText || mergeTranscriptChunk(lastMsg.text, incomingDelta);
                const updatedList = [...prev];
                updatedList[lastIdx] = {
                  ...lastMsg,
                  id: turnId || lastMsg.id,
                  text: updatedText,
                  isPartial: !isFinished,
                  timestamp: Date.now(),
                };
                return updatedList;
              }

              // 3. New teacher response turn
              const newText = incomingFullText || incomingDelta;
              if (!newText.trim()) return prev;

              return [
                ...prev,
                {
                  id: turnId || `teacher-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  role: 'teacher',
                  text: newText,
                  timestamp: Date.now(),
                  isPartial: !isFinished,
                },
              ];
            });
          } else if (msg.type === 'transcript_student') {
            const turnId = (msg.turnId as string) || '';
            const incomingFullText = (msg.text as string) || '';
            const incomingDelta = (msg.delta as string) || '';
            const isFinished = !!msg.finished;

            setMessages((prev) => {
              // 1. If we have a turnId, update that specific student message
              if (turnId) {
                const existingIdx = prev.findIndex((m) => m.id === turnId);
                if (existingIdx !== -1) {
                  const existing = prev[existingIdx];
                  const updatedText = incomingFullText || mergeTranscriptChunk(existing.text, incomingDelta);
                  const updatedList = [...prev];
                  updatedList[existingIdx] = {
                    ...existing,
                    text: updatedText,
                    isPartial: !isFinished,
                    timestamp: Date.now(),
                  };
                  return updatedList;
                }
              }

              // 2. Otherwise update the last student message if still partial
              const lastIdx = prev.length - 1;
              const lastMsg = prev[lastIdx];
              if (lastMsg && lastMsg.role === 'student' && lastMsg.isPartial) {
                const updatedText = incomingFullText || mergeTranscriptChunk(lastMsg.text, incomingDelta);
                const updatedList = [...prev];
                updatedList[lastIdx] = {
                  ...lastMsg,
                  id: turnId || lastMsg.id,
                  text: updatedText,
                  isPartial: !isFinished,
                  timestamp: Date.now(),
                };
                return updatedList;
              }

              // 3. New student spoken message
              const newText = incomingFullText || incomingDelta;
              if (!newText.trim()) return prev;

              return [
                ...prev,
                {
                  id: turnId || `student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  role: 'student',
                  text: newText,
                  timestamp: Date.now(),
                  isPartial: !isFinished,
                },
              ];
            });
          } else if (msg.type === 'turn_complete') {
            const turnId = msg.turnId as string | undefined;
            const finalText = msg.text as string | undefined;
            // Finalize partial message in transcript while preserving full text
            setMessages((prev) =>
              prev.map((m) => {
                if (turnId && m.id === turnId) {
                  return {
                    ...m,
                    text: finalText || m.text,
                    isPartial: false,
                  };
                }
                if (m.isPartial) {
                  return { ...m, isPartial: false };
                }
                return m;
              })
            );
          } else if (msg.type === 'interrupted') {
            // Teacher was interrupted by student: stop playback immediately and finalize partial teacher message
            audioPlayerRef.current?.stopAll();
            const turnId = msg.turnId as string | undefined;
            const finalText = msg.text as string | undefined;
            setMessages((prev) =>
              prev.map((m) => {
                if (turnId && m.id === turnId) {
                  return {
                    ...m,
                    text: finalText || m.text,
                    isPartial: false,
                  };
                }
                if (m.isPartial) {
                  return { ...m, isPartial: false };
                }
                return m;
              })
            );
          } else if (msg.type === 'tool_call_start') {
            setToolCallCount((c) => c + 1);
            const isImageTool = msg.name === 'image_generator';
            setToolCallState({
              status: 'running',
              name: msg.name,
              callId: msg.callId,
              visualType: isImageTool ? 'image' : 'svg',
              args: msg.args || { topic: '', description: '' },
              svgMarkup: null,
              imageUrl: null,
              rawText: null,
              error: null,
              durationMs: null,
              usageMetadata: null,
              timestamp: msg.timestamp || Date.now(),
            });

            // Append inline tool notice in transcript
            setMessages((prev) => [
              ...prev,
              {
                id: `tool-${msg.callId || Date.now()}`,
                role: 'tool',
                text: isImageTool
                  ? `🎨 Creating picture with Nano Banana 2: "${msg.args?.topic || 'Visual Concept'}"`
                  : `✏️ Drawing SVG diagram: "${msg.args?.topic || 'Educational diagram'}"`,
                timestamp: Date.now(),
                toolDetails: {
                  callId: msg.callId,
                  toolName: isImageTool ? 'image_generator' : 'svg_creator',
                  topic: msg.args?.topic || '',
                  targetClass: msg.args?.targetClass,
                  description: msg.args?.description || '',
                  status: 'running',
                },
              },
            ]);
          } else if (msg.type === 'tool_call_result') {
            const isImageTool = msg.name === 'image_generator' || !!msg.imageUrl;
            const hasSvg = !isImageTool && msg.success && !!msg.svgMarkup;
            const hasImage = isImageTool && msg.success && !!msg.imageUrl;
            const succeeded = hasSvg || hasImage;

            if (hasSvg && msg.svgMarkup) {
              setLatestSvg(msg.svgMarkup);
              // Save to this session's visual collection for parent timeline
              setSessionVisuals((prev) => [
                ...prev,
                {
                  callId: msg.callId,
                  topic: msg.args?.topic || 'Educational diagram',
                  targetClass: msg.args?.targetClass || sessionConfig.targetClass,
                  description: msg.args?.description || '',
                  type: 'svg',
                  svgMarkup: msg.svgMarkup,
                  generator: 'svg_creator',
                  timestamp: Date.now(),
                },
              ]);
            } else if (hasImage && msg.imageUrl) {
              setLatestImage(msg.imageUrl);
              // Save to this session's visual collection for parent timeline
              setSessionVisuals((prev) => [
                ...prev,
                {
                  callId: msg.callId,
                  topic: msg.args?.topic || 'Educational picture',
                  targetClass: msg.args?.targetClass || sessionConfig.targetClass,
                  description: msg.args?.description || msg.args?.prompt || '',
                  type: 'image',
                  imageUrl: msg.imageUrl,
                  generator: 'image_generator',
                  timestamp: Date.now(),
                },
              ]);
            }

            setToolCallState({
              status: succeeded ? 'succeeded' : 'failed',
              name: msg.name,
              callId: msg.callId,
              visualType: isImageTool ? 'image' : 'svg',
              args: msg.args || { topic: '', description: '' },
              svgMarkup: msg.svgMarkup || null,
              imageUrl: msg.imageUrl || null,
              rawText: msg.rawText || null,
              error: msg.error || null,
              durationMs: msg.durationMs || null,
              usageMetadata: msg.usageMetadata || null,
              timestamp: msg.timestamp || Date.now(),
            });

            // Update transcript tool notice status
            setMessages((prev) =>
              prev.map((m) => {
                if (m.toolDetails && m.toolDetails.callId === msg.callId) {
                  return {
                    ...m,
                    toolDetails: {
                      ...m.toolDetails,
                      status: succeeded ? 'succeeded' : 'failed',
                      imageUrl: msg.imageUrl,
                    },
                  };
                }
                return m;
              })
            );
          } else if (msg.type === 'usage_metadata') {
            const u = msg.usage || {};
            const promptTokensDetails = (u.promptTokensDetails || []) as ModalityDetail[];
            const responseTokensDetails = (u.responseTokensDetails || []) as ModalityDetail[];

            const audioIn = promptTokensDetails.find((d) => d.modality === 'AUDIO')?.tokenCount;
            const audioOut = responseTokensDetails.find((d) => d.modality === 'AUDIO')?.tokenCount;
            const textIn = promptTokensDetails.find((d) => d.modality === 'TEXT')?.tokenCount;
            const textOut = responseTokensDetails.find((d) => d.modality === 'TEXT')?.tokenCount;

            const total = u.totalTokenCount ?? u.responseTokenCount ?? 0;
            if (typeof total === 'number' && total > 0) {
              setCumulativeTokens((prev) => prev + total);
            }

            setUsageMetrics({
              promptTokenCount: u.promptTokenCount,
              candidatesTokenCount: u.candidatesTokenCount ?? u.responseTokenCount,
              totalTokenCount: u.totalTokenCount,
              cachedContentTokenCount: u.cachedContentTokenCount,
              thoughtsTokenCount: u.thoughtsTokenCount,
              audioInputTokens: audioIn,
              audioOutputTokens: audioOut,
              textInputTokens: textIn,
              textOutputTokens: textOut,
              rawDetails: u,
              lastUpdated: Date.now(),
            });
          } else if (msg.type === 'session_error') {
            setLastApiError(msg.error || 'Live session error occurred.');
            setConnectionStatus('error');
          } else if (msg.type === 'session_closed') {
            setConnectionStatus('disconnected');
            stopMicrophone();
          }
        } catch (err: unknown) {
          console.error('Error handling WebSocket message:', err);
        }
      };

      ws.onerror = () => {
        setConnectionStatus('error');
        setLastApiError('WebSocket connection error. Please reconnect.');
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        stopMicrophone();
      };
    },
    [sessionConfig, getAudioPlayer, activeResumeMemory, sessionStartTime]
  );

  const disconnectSession = useCallback(() => {
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'stop_session' }));
        }
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    stopMicrophone();
    audioPlayerRef.current?.stopAll();
    setConnectionStatus('disconnected');
  }, []);

  const startMicrophone = (wsInstance = wsRef.current) => {
    if (audioRecorderRef.current?.active) return;

    try {
      const recorder = new AudioRecorder((pcmBase64) => {
        if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
          wsInstance.send(
            JSON.stringify({
              type: 'realtime_audio',
              data: pcmBase64,
            })
          );
        }
      });

      recorder
        .start()
        .then(() => {
          audioRecorderRef.current = recorder;
          setIsMicActive(true);
        })
        .catch((err) => {
          console.warn('Microphone access denied or error:', err);
          setIsMicActive(false);
          setLastApiError(`Microphone error: ${err.message || String(err)}`);
        });
    } catch (err: any) {
      console.warn('Microphone error:', err);
    }
  };

  const stopMicrophone = () => {
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    setIsMicActive(false);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'audio_stream_end' }));
      } catch {}
    }
  };

  // Saves the current conversation to the parent timeline & generates AI continuity summary
  const handleSaveCurrentSession = async () => {
    if (messages.length === 0) return;
    setIsSavingSession(true);
    try {
      const duration = sessionStartTime
        ? Math.max(15, Math.round((Date.now() - sessionStartTime) / 1000))
        : 60;

      const userEmail = currentUser?.email || 'guest';
      const res = await fetch('/api/sessions/summarize-and-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
        },
        body: JSON.stringify({
          userEmail,
          id: `session-${Date.now()}`,
          startedAt: sessionStartTime || Date.now() - duration * 1000,
          endedAt: Date.now(),
          durationSeconds: duration,
          targetClass: sessionConfig.targetClass,
          transcript: messages,
          visuals: sessionVisuals,
          tokensUsed: cumulativeTokens,
        }),
      });

      const data = await res.json();
      if (data.session || data.sessions) {
        const addedCount = Array.isArray(data.sessions) ? data.sessions.length : 1;
        setSavedSessionCount((c) => c + addedCount);
        const latestSess =
          Array.isArray(data.sessions) && data.sessions.length > 0
            ? data.sessions[data.sessions.length - 1]
            : data.session;
        if (latestSess) {
          setActiveResumeMemory({
            resumeContext: latestSess.resumeContext,
            resumedTitle: latestSess.title,
          });
          // Also persist session to user's private Firestore subcollection
          if (currentUser) {
            try {
              await saveSessionToFirestore(currentUser.id, latestSess);
            } catch (fErr) {
              console.warn('Failed to persist session to Firestore:', fErr);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to save learning session:', err);
    } finally {
      setIsSavingSession(false);
    }
  };

  const handleToggleConnect = () => {
    if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
      // Auto-save lesson milestone to timeline when interaction ends
      if (messages.length >= 2) {
        handleSaveCurrentSession();
      }
      disconnectSession();
    } else {
      connectSession();
    }
  };

  const handleToggleMic = () => {
    if (isMicActive) {
      stopMicrophone();
    } else {
      startMicrophone();
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    if (!sessionStartTime) {
      setSessionStartTime(Date.now());
    }

    // Immediately push to transcript
    const newMsg: ChatMessage = {
      id: `student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'student',
      text: text.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMsg]);

    // Send to WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(
          JSON.stringify({
            type: 'send_text',
            text: text.trim(),
          })
        );
      } catch (err) {
        console.warn('Failed to send text message:', err);
      }
    } else {
      // Connect and send
      connectSession();
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(
              JSON.stringify({
                type: 'send_text',
                text: text.trim(),
              })
            );
          } catch (err) {
            console.warn('Failed to send text message:', err);
          }
        }
      }, 800);
    }
  };

  const handleClearSession = () => {
    // If dialogue took place, automatically save it so child's milestone is recorded
    if (messages.length >= 2) {
      handleSaveCurrentSession();
    }
    setMessages([]);
    setSessionVisuals([]);
    setSessionStartTime(null);
    setToolCallState(INITIAL_TOOL_STATE);
    setLatestSvg(null);
    setCumulativeTokens(0);
    setToolCallCount(0);
    setUsageMetrics({});
    setLastApiError(null);
    audioPlayerRef.current?.stopAll();
  };

  const handleApplyConfig = (newConfig: SessionConfig) => {
    setSessionConfig(newConfig);
    setEffectiveConfig(newConfig);
    if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
      disconnectSession();
      setTimeout(() => {
        connectSession(newConfig);
      }, 400);
    }
  };

  const handleGradeChange = (newGrade: string) => {
    const updated = { ...sessionConfig, targetClass: newGrade };
    setSessionConfig(updated);
    setEffectiveConfig((prev) => (prev ? { ...prev, targetClass: newGrade } : updated));
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(
          JSON.stringify({
            type: 'update_target_class',
            targetClass: newGrade,
          })
        );
      } catch (err) {
        console.warn('Failed to update target class on socket:', err);
      }
    }
  };

  // Called when parent clicks "Resume AI from this lesson" in the timeline portal
  const handleResumeFromPastSession = (session: LearningSession) => {
    setActiveResumeMemory({
      resumeContext: session.resumeContext,
      resumedTitle: session.title,
    });

    if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
      disconnectSession();
      setTimeout(() => {
        connectSession(sessionConfig, session.resumeContext, session.title);
      }, 400);
    } else {
      connectSession(sessionConfig, session.resumeContext, session.title);
    }
  };

  const handleResetResumeMemory = () => {
    setActiveResumeMemory(null);
    if (connectionStatus === 'connected') {
      disconnectSession();
      setTimeout(() => {
        connectSession(sessionConfig, 'NONE', 'Fresh Lesson');
      }, 400);
    }
  };

  // Google Sign-In & Sign-Up resolution
  const handleGoogleAuthSuccess = (profile: UserProfile, isFirstTime: boolean) => {
    setCurrentUser(profile);
    try {
      localStorage.setItem('truncky_current_user', JSON.stringify(profile));
    } catch (e) {
      console.warn('Could not save user to localStorage:', e);
    }

    const localOnboarded =
      localStorage.getItem(`truncky_onboarded_${profile.id}`) === 'true';
    const hasClassAndLang =
      !!profile.preferences?.targetClass &&
      profile.preferences.targetClass.trim() !== '' &&
      Array.isArray(profile.preferences?.languages) &&
      profile.preferences.languages.length > 0;
    const isCompleted = !isFirstTime && (!!profile.onboardingCompleted || localOnboarded || hasClassAndLang);

    // Only prompt with questions if brand new first-time user and not yet onboarded
    if (!isCompleted) {
      setTimeout(() => {
        setIsKidOnboardingOpen(true);
      }, 250);
    } else if (profile.preferences && profile.preferences.targetClass) {
      // Returning user: re-apply existing profile preferences directly
      handleSaveKidPreferences(profile.preferences);
    }
  };

  // Saves language and grade preferences, updating ONLY those specific parts in the system prompt
  const handleSaveKidPreferences = async (prefs: {
    languages: string[];
    primaryLanguage: string;
    targetClass: string;
    childName?: string;
  }) => {
    const updatedSystemPrompt = buildTeacherPrompt({
      selectedLanguages: prefs.languages,
      targetClass: prefs.targetClass,
      childName: prefs.childName,
    });

    const updatedConfig: SessionConfig = {
      ...sessionConfig,
      targetClass: prefs.targetClass,
      selectedLanguages: prefs.languages,
      systemPrompt: updatedSystemPrompt,
    };

    setSessionConfig(updatedConfig);
    setEffectiveConfig((prev) =>
      prev
        ? {
            ...prev,
            targetClass: prefs.targetClass,
            selectedLanguages: prefs.languages,
            systemPrompt: updatedSystemPrompt,
          }
        : updatedConfig
    );

    // Persist in user profile & Firestore
    if (currentUser) {
      const updatedProfile: UserProfile = {
        ...currentUser,
        onboardingCompleted: true,
        preferences: prefs,
      };
      setCurrentUser(updatedProfile);
      try {
        localStorage.setItem('truncky_current_user', JSON.stringify(updatedProfile));
        localStorage.setItem(`truncky_onboarded_${currentUser.id}`, 'true');
        await saveUserKidPreferences(currentUser.id, prefs);
      } catch (e) {
        console.warn('Failed to update Firestore with preferences:', e);
      }
    }

    // Synchronize over active WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(
          JSON.stringify({
            type: 'update_target_class',
            targetClass: prefs.targetClass,
          })
        );
        wsRef.current.send(
          JSON.stringify({
            type: 'update_system_prompt',
            systemPrompt: updatedSystemPrompt,
          })
        );
      } catch (err) {
        console.warn('Failed to notify WebSocket of prompt updates:', err);
      }
    }

    setIsKidOnboardingOpen(false);
  };

  const handleSignOut = async () => {
    if (messages.length >= 2) {
      await handleSaveCurrentSession();
    }
    if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
      disconnectSession();
    }
    try {
      await signOutUser();
    } catch (err) {
      console.warn('Error signing out:', err);
    }
    setCurrentUser(null);
    try {
      localStorage.removeItem('truncky_current_user');
    } catch {}
  };

  // Auth checking splash screen
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-linear-to-b from-indigo-50 via-white to-amber-50/40 flex flex-col items-center justify-center p-6 text-neutral-800">
        <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center text-4xl shadow-md animate-bounce mb-4 select-none">
          🐘
        </div>
        <p className="text-sm font-bold text-neutral-800">Connecting to Truncky AI...</p>
        <p className="text-xs text-neutral-500 mt-1">Verifying your learning account...</p>
      </div>
    );
  }

  // Gateway: If not logged in, render the LandingPage as the landing page of the web app
  if (!currentUser) {
    return <LandingPage onAuthSuccess={handleGoogleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-neutral-300 py-3.5 px-4 sm:px-6 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-xs shrink-0 text-2xl select-none">
              🐘
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-950 font-serif">
                  Truncky AI{' '}
                  <span className="text-xs sm:text-sm font-medium text-neutral-500 font-sans tracking-normal">
                    (Truncky ~ Elephant)
                  </span>
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  Kids Companion + Teacher AI
                </span>
              </div>
              <p className="text-xs text-neutral-600 mt-0.5">
                Friendly elephant companion & tutor for Classes 1–5 • Live Voice, SVG Visuals & Learning Timeline
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Authenticated Parent & Kid Configuration Pill */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsKidOnboardingOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-950 font-semibold text-xs transition-colors cursor-pointer"
                title="Edit languages & grade configuration"
              >
                <Globe className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden sm:inline font-medium">
                  {currentUser.preferences?.childName ? `${currentUser.preferences.childName}: ` : ''}
                  {currentUser.preferences?.languages?.slice(0, 2).join(', ')}
                  {(currentUser.preferences?.languages?.length || 0) > 2 ? '...' : ''}
                </span>
                <span className="text-[10px] bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded-full font-bold">
                  {currentUser.preferences?.targetClass || sessionConfig.targetClass}
                </span>
                <Edit3 className="h-3 w-3 text-indigo-500" />
              </button>

              {/* Logged in Parent User Avatar & Sign Out */}
              <div className="flex items-center gap-1.5 pl-1.5 border-l border-neutral-200">
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-7 h-7 rounded-full bg-neutral-100 border border-neutral-300"
                />
                <span className="text-xs font-bold text-neutral-800 max-w-[90px] truncate hidden md:inline">
                  {currentUser.name}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="p-1 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Parent Learning Timeline Button */}
            <button
              type="button"
              onClick={() => setIsParentPortalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
              title="Open Parent Dashboard & Learning Timeline"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Parent Timeline</span>
              {savedSessionCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-800 text-white font-mono text-[10px]">
                  {savedSessionCount}
                </span>
              )}
            </button>

            {/* Target Grade Dropdown */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-200">
              <label htmlFor="header-target-grade-select" className="font-semibold text-neutral-700">
                Grade:
              </label>
              <select
                id="header-target-grade-select"
                value={sessionConfig.targetClass}
                onChange={(e) => handleGradeChange(e.target.value)}
                className="px-2.5 py-1 rounded bg-indigo-50 border border-indigo-300 text-indigo-900 font-bold text-xs focus:ring-1 focus:ring-indigo-600 focus:outline-hidden cursor-pointer hover:bg-indigo-100 transition-colors shadow-2xs"
              >
                <option value="Class 1">Class 1</option>
                <option value="Class 2">Class 2</option>
                <option value="Class 3">Class 3</option>
                <option value="Class 4">Class 4</option>
                <option value="Class 5">Class 5</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-4 flex flex-col">
        {/* Settings Bar */}
        <SettingsSection
          currentConfig={sessionConfig}
          effectiveConfig={effectiveConfig}
          isConnected={connectionStatus === 'connected'}
          onApplyConfig={handleApplyConfig}
        />

        {/* Two-Panel Core Workspace - Fixed height to ensure visual panel remains constantly in view */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:h-[620px]">
          {/* Left Panel: Teacher Conversation */}
          <div className="h-[520px] lg:h-full min-h-0">
            <ConversationPanel
              messages={messages}
              connectionStatus={connectionStatus}
              isMicActive={isMicActive}
              isMuted={isMuted}
              onToggleConnect={handleToggleConnect}
              onToggleMic={handleToggleMic}
              onToggleMute={handleToggleMute}
              onSendMessage={handleSendMessage}
              onClearSession={handleClearSession}
              activeModelName={sessionConfig.model}
              onSaveCurrentSession={handleSaveCurrentSession}
              isSavingSession={isSavingSession}
              onOpenParentPortal={() => setIsParentPortalOpen(true)}
              resumeNotice={activeResumeMemory?.resumeContext}
              resumedFromTitle={activeResumeMemory?.resumedTitle}
              savedSessionCount={savedSessionCount}
              onResetResumeMemory={handleResetResumeMemory}
            />
          </div>

          {/* Right Panel: Visual Teaching Canvas */}
          <div className="h-[520px] lg:h-full min-h-0">
            <VisualPanel
              latestSvg={latestSvg}
              latestImage={latestImage}
              toolCallState={toolCallState}
              targetClass={sessionConfig.targetClass}
            />
          </div>
        </div>

        {/* Bottom Diagnostics & Token Usage */}
        <DiagnosticsPanel
          usage={usageMetrics}
          cumulativeTokens={cumulativeTokens}
          selectedModel={sessionConfig.model}
          selectedVoice={sessionConfig.voice}
          connectionStatus={connectionStatus}
          toolCallCount={toolCallCount}
          lastToolStatus={toolCallState.status}
          lastToolDurationMs={toolCallState.durationMs}
          lastApiError={lastApiError}
        />
      </main>

      {/* Parent Learning Portal & Timeline Modal (User-Isolated) */}
      <ParentLearningPortal
        isOpen={isParentPortalOpen}
        onClose={() => setIsParentPortalOpen(false)}
        onResumeSession={handleResumeFromPastSession}
        targetClass={sessionConfig.targetClass}
        userId={currentUser.id}
        userEmail={currentUser.email}
        userName={currentUser.name}
        onSessionDeleted={() => loadUserSessions(currentUser.email)}
      />

      {/* First-Time & Ongoing Kid Profile Onboarding (Languages + Class) */}
      <KidOnboardingModal
        isOpen={isKidOnboardingOpen}
        userProfile={currentUser}
        onClose={() => setIsKidOnboardingOpen(false)}
        onSave={handleSaveKidPreferences}
      />
    </div>
  );
}
