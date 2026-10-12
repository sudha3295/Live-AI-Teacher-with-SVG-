/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ConversationPanel } from './components/ConversationPanel';
import { VisualPanel } from './components/VisualPanel';
import { SettingsSection, DEFAULT_TEACHER_PROMPT } from './components/SettingsSection';
import { DiagnosticsPanel } from './components/DiagnosticsPanel';
import { AudioRecorder, AudioPlayer } from './utils/audio';
import {
  ChatMessage,
  ToolCallState,
  UsageMetrics,
  SessionConfig,
  ModalityDetail,
} from './types';

const INITIAL_CONFIG: SessionConfig = {
  model: 'gemini-3.8-live',
  voice: 'Zephyr',
  targetClass: 'Class 2',
  systemPrompt: DEFAULT_TEACHER_PROMPT,
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
  const [toolCallState, setToolCallState] = useState<ToolCallState>(INITIAL_TOOL_STATE);

  const [usageMetrics, setUsageMetrics] = useState<UsageMetrics>({});
  const [cumulativeTokens, setCumulativeTokens] = useState<number>(0);
  const [toolCallCount, setToolCallCount] = useState<number>(0);
  const [lastApiError, setLastApiError] = useState<string | null>(null);

  // References to audio and websocket instances
  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const isMutedRef = useRef<boolean>(false);

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
    (configToUse: SessionConfig = sessionConfig) => {
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
        // Send start session configuration
        ws.send(
          JSON.stringify({
            type: 'start_session',
            model: configToUse.model,
            voice: configToUse.voice,
            targetClass: configToUse.targetClass,
            systemPrompt: configToUse.systemPrompt,
            prefixPaddingMs: configToUse.prefixPaddingMs,
            silenceDurationMs: configToUse.silenceDurationMs,
            maxOutputTokens: configToUse.maxOutputTokens,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'session_status') {
            if (msg.status === 'connected') {
              setConnectionStatus('connected');
            } else if (msg.status === 'connecting') {
              setConnectionStatus('connecting');
              if (msg.effectiveConfig) {
                setEffectiveConfig(msg.effectiveConfig);
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
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === 'teacher' && lastMsg.isPartial) {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMsg,
                    text: msg.text,
                    isPartial: !msg.finished,
                    timestamp: Date.now(),
                  },
                ];
              } else {
                return [
                  ...prev,
                  {
                    id: `teacher-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    role: 'teacher',
                    text: msg.text,
                    timestamp: Date.now(),
                    isPartial: !msg.finished,
                  },
                ];
              }
            });
          } else if (msg.type === 'transcript_student') {
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === 'student' && lastMsg.isPartial) {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMsg,
                    text: msg.text,
                    isPartial: !msg.finished,
                    timestamp: Date.now(),
                  },
                ];
              } else {
                return [
                  ...prev,
                  {
                    id: `student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    role: 'student',
                    text: msg.text,
                    timestamp: Date.now(),
                    isPartial: !msg.finished,
                  },
                ];
              }
            });
          } else if (msg.type === 'turn_complete') {
            // Finalize any partial message in transcript
            setMessages((prev) =>
              prev.map((m) => (m.isPartial ? { ...m, isPartial: false } : m))
            );
          } else if (msg.type === 'interrupted') {
            // Teacher was interrupted by student: stop playback immediately
            audioPlayerRef.current?.stopAll();
          } else if (msg.type === 'tool_call_start') {
            setToolCallCount((c) => c + 1);
            setToolCallState({
              status: 'running',
              name: msg.name,
              callId: msg.callId,
              args: msg.args || { topic: '', description: '' },
              svgMarkup: null,
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
                text: `Drawing: "${msg.args?.topic || 'Educational diagram'}"`,
                timestamp: Date.now(),
                toolDetails: {
                  callId: msg.callId,
                  topic: msg.args?.topic || '',
                  targetClass: msg.args?.targetClass,
                  description: msg.args?.description || '',
                  status: 'running',
                },
              },
            ]);
          } else if (msg.type === 'tool_call_result') {
            const hasSvg = msg.success && !!msg.svgMarkup;
            if (hasSvg) {
              setLatestSvg(msg.svgMarkup);
            }

            setToolCallState({
              status: hasSvg ? 'succeeded' : 'failed',
              name: msg.name,
              callId: msg.callId,
              args: msg.args || { topic: '', description: '' },
              svgMarkup: msg.svgMarkup || null,
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
                      status: hasSvg ? 'succeeded' : 'failed',
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
    [sessionConfig, getAudioPlayer]
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
      wsRef.current.send(JSON.stringify({ type: 'audio_stream_end' }));
    }
  };

  const handleToggleConnect = () => {
    if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
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
      wsRef.current.send(
        JSON.stringify({
          type: 'send_text',
          text: text.trim(),
        })
      );
    } else {
      // Connect and send
      connectSession();
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'send_text',
              text: text.trim(),
            })
          );
        }
      }, 800);
    }
  };

  const handleClearSession = () => {
    setMessages([]);
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

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="bg-white border-b border-neutral-300 py-3.5 px-4 sm:px-6 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900">
                AI Teacher — Live Voice + SVG Visual Teaching
              </h1>
            </div>
            <p className="text-xs text-neutral-600 mt-0.5">
              Interactive tutoring for Classes 1–5 combining Gemini Live conversation and synchronized educational SVG illustrations
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="header-target-grade-select" className="font-semibold text-neutral-700">
              Target Grade:
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

        {/* Two-Panel Core Workspace - Fixed height to ensure SVG visual panel remains constantly in view */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:h-[620px]">
          {/* Left Panel: Teacher Conversation (Fixed height with internal scroll to latest message) */}
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
            />
          </div>

          {/* Right Panel: Visual Teaching Canvas (Permanently positioned & constantly visible) */}
          <div className="h-[520px] lg:h-full min-h-0">
            <VisualPanel
              latestSvg={latestSvg}
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
    </div>
  );
}
