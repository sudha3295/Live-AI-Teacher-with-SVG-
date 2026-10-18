import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Modality, LiveServerMessage, ThinkingLevel } from '@google/genai';
import {
  executeSvgCreator,
  svgCreatorFunctionDeclaration,
  INITIAL_SVG_SYSTEM_PROMPT,
  CLASS_GUIDELINES,
  extractAndSanitizeSvg,
} from './src/server/svg-creator.ts';
import { DEFAULT_TEACHER_PROMPT, buildTeacherPrompt } from './src/utils/prompts.ts';
import {
  getAllSessions,
  getSessionById,
  saveOrUpdateSession,
  deleteSession,
  getLatestResumeContext,
  summarizeAndSegmentSessionsWithAI,
} from './src/server/session-storage.ts';
import {
  imageGeneratorFunctionDeclaration,
  executeImageGenerator,
} from './src/server/image-generator.ts';
import { LearningSession } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

const server = createServer(app);

// Handle server-level client errors so unhandled socket drops don't crash
server.on('clientError', (err: any, socket) => {
  if (err.code === 'ECONNRESET' || !socket.writable) {
    return;
  }
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

// Explicit WebSocketServer without automatic server binding to safely manage upgrades
const wss = new WebSocketServer({ noServer: true });

wss.on('error', (err) => {
  console.warn('WebSocketServer caught error:', err);
});

server.on('upgrade', (request, socket, head) => {
  socket.on('error', (err) => {
    console.warn('Socket upgrade error:', err?.message || err);
  });

  try {
    const host = request.headers.host || 'localhost';
    const url = new URL(request.url || '', `http://${host}`);
    if (url.pathname === '/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  } catch (err) {
    console.warn('Failed to handle upgrade request:', err);
    socket.destroy();
  }
});

// Initialize Google GenAI for Gemini Live session
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Dedicated Google GenAI client for SVG Creation (uses paid tier key to prevent 503 high-demand errors)
const svgApiKey =
  process.env.GEMINI_SVG_API_KEY ||
  'AQ.Ab8RN6LZWd7f8M0pmXYvepfAfyUaoqtihe-ThGKTpi9ax_Occw' ||
  process.env.GEMINI_API_KEY ||
  '';

const svgAi = new GoogleGenAI({
  apiKey: svgApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// REST endpoint for direct SVG generation testing (compatible with SVG Teaching Visual Tester)
app.post('/api/generate-svg', async (req, res) => {
  try {
    const { model, systemPrompt, prompt, maxOutputTokens } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt in request body.' });
    }

    const startTime = Date.now();
    const response = await svgAi.models.generateContent({
      model: model || 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt || INITIAL_SVG_SYSTEM_PROMPT,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        maxOutputTokens: typeof maxOutputTokens === 'number' ? maxOutputTokens : 8192,
        temperature: 0.2,
      },
    });

    const durationMs = Date.now() - startTime;
    const rawText = response.text || '';
    const { svgMarkup, error } = extractAndSanitizeSvg(rawText);

    return res.json({
      rawText,
      svgMarkup,
      error,
      usageMetadata: response.usageMetadata || null,
      durationMs,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('API /generate-svg error:', errorMsg);
    return res.status(500).json({ error: errorMsg });
  }
});

// REST endpoint for direct Image Generation with Nano Banana 2 (gemini-3.1-flash-lite-image / gemini-nano-banana-2.1)
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, topic, targetClass } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt in request body.' });
    }

    const result = await executeImageGenerator(svgAi, {
      prompt,
      topic: topic || 'Educational Visual',
      targetClass: targetClass || 'Class 2',
    });

    return res.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('API /generate-image error:', errorMsg);
    return res.status(500).json({ error: errorMsg });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Helper to extract the authenticated user's email or default to guest
function extractUserEmail(req: express.Request): string {
  const headerEmail = (req.headers['x-user-email'] as string) || '';
  const queryEmail = (req.query.userEmail as string) || '';
  const bodyEmail = (req.body?.userEmail as string) || '';
  return headerEmail || queryEmail || bodyEmail || 'guest';
}

// Learning Sessions & Parent Timeline Endpoints (Strictly user-isolated)
app.get('/api/sessions', (req, res) => {
  try {
    const userEmail = extractUserEmail(req);
    const sessions = getAllSessions(userEmail);
    res.json({ sessions, userEmail });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/sessions/:id', (req, res) => {
  try {
    const userEmail = extractUserEmail(req);
    const session = getSessionById(req.params.id, userEmail);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ session, userEmail });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/sessions', (req, res) => {
  try {
    const userEmail = extractUserEmail(req);
    const sessionData = req.body;
    if (!sessionData || !sessionData.id) {
      return res.status(400).json({ error: 'Missing session data or id' });
    }
    const saved = saveOrUpdateSession(sessionData, userEmail);
    res.json({ session: saved, userEmail });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/sessions/summarize-and-save', async (req, res) => {
  try {
    const userEmail = extractUserEmail(req);
    const { id, startedAt, endedAt, durationSeconds, targetClass, transcript, visuals, tokensUsed } =
      req.body;
    
    // Automatically detects topic deviation/transition for this specific user's timeline!
    const resultingSessions = await summarizeAndSegmentSessionsWithAI(
      svgAi,
      {
        targetClass: targetClass || 'Class 2',
        transcript: transcript || [],
        visuals: visuals || [],
        durationSeconds,
        startedAt,
        endedAt,
        tokensUsed,
      },
      userEmail
    );

    res.json({
      sessions: resultingSessions,
      session: resultingSessions[0] || null,
      segmentedCount: resultingSessions.length,
      userEmail,
    });
  } catch (err) {
    console.error('Error in summarize-and-save:', err);
    res.status(500).json({ error: String(err) });
  }
});

app.delete('/api/sessions/:id', (req, res) => {
  try {
    const userEmail = extractUserEmail(req);
    const deleted = deleteSession(req.params.id, userEmail);
    res.json({ success: deleted, userEmail });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/resume-context', (req, res) => {
  try {
    const userEmail = extractUserEmail(req);
    const targetClass = typeof req.query.targetClass === 'string' ? req.query.targetClass : undefined;
    const context = getLatestResumeContext(targetClass, userEmail);
    res.json({ ...context, userEmail });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// User & Kid Learning Profile API (Google Sign In & Onboarding)
const DATA_DIR = path.resolve(__dirname, 'data');
const USER_PROFILES_FILE = path.resolve(DATA_DIR, 'user-profiles.json');

app.get('/api/user/profile', (req, res) => {
  try {
    if (fs.existsSync(USER_PROFILES_FILE)) {
      const data = JSON.parse(fs.readFileSync(USER_PROFILES_FILE, 'utf-8'));
      return res.json({ profile: data.currentProfile || null });
    }
    res.json({ profile: null });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/user/profile', (req, res) => {
  try {
    const profile = req.body;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      USER_PROFILES_FILE,
      JSON.stringify({ currentProfile: profile }, null, 2),
      'utf-8'
    );
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Helper to merge incremental speech-to-text / transcription tokens without truncating or repeating
function mergeTranscriptChunk(currentAccumulated: string, incoming: string): string {
  const cur = (currentAccumulated || '').trim();
  const inc = (incoming || '').trim();
  if (!cur) return incoming || '';
  if (!inc) return currentAccumulated || '';

  // If incoming already starts with current (Gemini returned an updated full sentence)
  if (incoming.startsWith(currentAccumulated)) {
    return incoming;
  }
  // If current already starts with incoming (stale or partial replay)
  if (currentAccumulated.startsWith(incoming)) {
    return currentAccumulated;
  }
  // If incoming contains current as a substring
  if (incoming.includes(currentAccumulated)) {
    return incoming;
  }

  // Token or delta append with appropriate whitespace
  const needsSpace =
    !currentAccumulated.endsWith(' ') &&
    !incoming.startsWith(' ') &&
    !/^[,.!?;:'")\]\}]/.test(incoming);
  return currentAccumulated + (needsSpace ? ' ' : '') + incoming;
}

// Live WebSocket connections
wss.on('connection', (clientWs: WebSocket) => {
  let activeLiveSession: any = null;
  let isClosing = false;
  let currentTargetClass = 'Class 2';
  let currentMaxOutputTokens = 8192;
  let currentSelectedLanguages: string[] = ['English'];
  let currentTeacherTurnId = `teacher-${Date.now()}`;
  let currentTeacherTurnText = '';
  let teacherTurnCompleted = false;
  let currentStudentTurnId = `student-${Date.now()}`;
  let currentStudentTurnText = '';
  let studentTurnCompleted = false;

  const sendToClient = (data: Record<string, unknown>) => {
    try {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify(data));
      }
    } catch (err) {
      console.warn('Failed to send to client WebSocket:', err);
    }
  };

  clientWs.on('error', (err) => {
    console.warn('Client WebSocket error caught:', (err as any)?.message || err);
    if (activeLiveSession) {
      try {
        activeLiveSession.close();
      } catch {}
      activeLiveSession = null;
    }
  });

  clientWs.on('message', async (messageBuffer) => {
    try {
      const msg = JSON.parse(messageBuffer.toString());

      if (msg.type === 'start_session') {
        if (!process.env.GEMINI_API_KEY) {
          sendToClient({
            type: 'session_error',
            error: 'GEMINI_API_KEY is not configured on the server. Please check the Secrets panel.',
          });
          return;
        }

        // Close any existing session
        if (activeLiveSession) {
          try {
            activeLiveSession.close();
          } catch {}
          activeLiveSession = null;
        }

        const model = msg.model || 'gemini-3.8-live';
        const voice = msg.voice || 'Zephyr';
        const sessionUserEmail = msg.userEmail || 'guest';
        currentTargetClass = msg.targetClass || 'Class 2';
        currentMaxOutputTokens = typeof msg.maxOutputTokens === 'number' ? msg.maxOutputTokens : 8192;
        currentSelectedLanguages = Array.isArray(msg.selectedLanguages) && msg.selectedLanguages.length > 0
          ? msg.selectedLanguages
          : ['English', 'Tamil'];

        // Build teacher prompt dynamically: only targetClass, selectedLanguages, and language checks are updated
        const baseSystemPrompt =
          msg.systemPrompt ||
          buildTeacherPrompt({
            selectedLanguages: currentSelectedLanguages,
            targetClass: currentTargetClass,
            childName: msg.childName,
          });

        const prefixPaddingMs = typeof msg.prefixPaddingMs === 'number' ? msg.prefixPaddingMs : 300;
        const silenceDurationMs = typeof msg.silenceDurationMs === 'number' ? msg.silenceDurationMs : 500;

        // Check if resuming from previous learning history (isolated per user)
        let finalSystemPrompt = baseSystemPrompt;
        let resumeNotice: string | null = null;
        let resumedFromSessionTitle: string | null = null;

        if (msg.resumeContext) {
          finalSystemPrompt = `${baseSystemPrompt}\n\n${msg.resumeContext}`;
          resumeNotice = 'Custom session context active';
          resumedFromSessionTitle = msg.resumedTitle || 'Selected Session';
        } else if (msg.useResumeMemory !== false) {
          const { hasHistory, resumeInstructionText, latestSession } =
            getLatestResumeContext(currentTargetClass, sessionUserEmail);
          if (hasHistory && resumeInstructionText) {
            finalSystemPrompt = `${baseSystemPrompt}\n\n${resumeInstructionText}`;
            resumeNotice = latestSession
              ? `Resuming from: "${latestSession.title}"`
              : 'Previous learning memory active';
            resumedFromSessionTitle = latestSession?.title || null;
          }
        }

        sendToClient({
          type: 'session_status',
          status: 'connecting',
          effectiveConfig: {
            model,
            voice,
            targetClass: currentTargetClass,
            prefixPaddingMs,
            silenceDurationMs,
            maxOutputTokens: currentMaxOutputTokens,
            systemPromptLength: finalSystemPrompt.length,
            resumeNotice,
            resumedFromSessionTitle,
          },
        });

        try {
          const session = await ai.live.connect({
            model,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice },
                },
              },
              systemInstruction: finalSystemPrompt,
              realtimeInputConfig: {
                automaticActivityDetection: {
                  prefixPaddingMs,
                  silenceDurationMs,
                },
              },
              maxOutputTokens: currentMaxOutputTokens,
              outputAudioTranscription: {},
              inputAudioTranscription: {},
              tools: [
                {
                  functionDeclarations: [
                    svgCreatorFunctionDeclaration,
                    imageGeneratorFunctionDeclaration,
                  ],
                },
              ],
            },
            callbacks: {
              onmessage: async (serverMsg: LiveServerMessage) => {
                try {
                  // 1. Process server content parts (audio stream)
                  const parts = serverMsg.serverContent?.modelTurn?.parts || [];
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      sendToClient({
                        type: 'audio',
                        data: part.inlineData.data,
                      });
                    }
                  }

                  // 2. Output audio transcription (words spoken by the teacher model)
                  // @ts-ignore
                  const outTrans = serverMsg.outputTranscription || serverMsg.serverContent?.outputTranscription;
                  const teacherPartText = parts.find((p) => p.text)?.text;
                  const teacherDelta = outTrans?.text || teacherPartText;

                  if (teacherDelta) {
                    if (teacherTurnCompleted) {
                      currentTeacherTurnId = `teacher-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                      currentTeacherTurnText = '';
                      teacherTurnCompleted = false;
                    }
                    currentTeacherTurnText = mergeTranscriptChunk(currentTeacherTurnText, teacherDelta);
                    sendToClient({
                      type: 'transcript_teacher',
                      turnId: currentTeacherTurnId,
                      text: currentTeacherTurnText,
                      delta: teacherDelta,
                      finished: !!outTrans?.finished,
                    });
                  }

                  // 3. Input audio transcription (words spoken by the child)
                  // @ts-ignore
                  const inTrans = serverMsg.inputTranscription || serverMsg.serverContent?.inputTranscription;
                  // @ts-ignore
                  const interimTrans = serverMsg.interimInputTranscription || serverMsg.serverContent?.interimInputTranscription;
                  const studentRaw = inTrans?.text || interimTrans?.text;

                  if (studentRaw) {
                    teacherTurnCompleted = true; // student started speaking, teacher turn is done
                    if (studentTurnCompleted) {
                      currentStudentTurnId = `student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                      currentStudentTurnText = '';
                      studentTurnCompleted = false;
                    }

                    currentStudentTurnText = mergeTranscriptChunk(currentStudentTurnText, studentRaw);
                    if (inTrans?.finished) {
                      studentTurnCompleted = true;
                    }

                    sendToClient({
                      type: 'transcript_student',
                      turnId: currentStudentTurnId,
                      text: currentStudentTurnText,
                      delta: studentRaw,
                      finished: !!inTrans?.finished,
                      isInterim: !inTrans && !!interimTrans,
                    });
                  }

                  // 4. Interrupted flag
                  if (serverMsg.serverContent?.interrupted) {
                    teacherTurnCompleted = true;
                    studentTurnCompleted = true;
                    sendToClient({
                      type: 'interrupted',
                      turnId: currentTeacherTurnId,
                      text: currentTeacherTurnText,
                    });
                  }

                  // 5. Turn completion
                  if (serverMsg.serverContent?.turnComplete) {
                    teacherTurnCompleted = true;
                    sendToClient({
                      type: 'turn_complete',
                      turnId: currentTeacherTurnId,
                      text: currentTeacherTurnText,
                    });
                  }

                  // 6. Handle tool calls (SVG Creator & Nano Banana 2 Image Generator)
                  if (serverMsg.toolCall?.functionCalls && serverMsg.toolCall.functionCalls.length > 0) {
                    for (const call of serverMsg.toolCall.functionCalls) {
                      if (call.name === 'svg_creator') {
                        const callArgs = (call.args || {}) as {
                          topic?: string;
                          targetClass?: string;
                          description?: string;
                        };

                        const topic = callArgs.topic || 'Visual Concept';
                        const targetClass = callArgs.targetClass || currentTargetClass || 'Class 2';
                        const description = callArgs.description || topic;

                        // Inform client that tool has been invoked
                        sendToClient({
                          type: 'tool_call_start',
                          callId: call.id,
                          name: call.name,
                          visualType: 'svg',
                          args: { topic, targetClass, description },
                          timestamp: Date.now(),
                        });

                        // Execute the real SVG Creator with dedicated paid key and configured output token window
                        const result = await executeSvgCreator(svgAi, {
                          topic,
                          targetClass,
                          description,
                          maxOutputTokens: currentMaxOutputTokens,
                        });

                        // Inform client of result
                        sendToClient({
                          type: 'tool_call_result',
                          callId: call.id,
                          name: call.name,
                          visualType: 'svg',
                          args: { topic, targetClass, description },
                          success: result.success,
                          rawText: result.rawText,
                          svgMarkup: result.svgMarkup,
                          error: result.error,
                          usageMetadata: result.usageMetadata,
                          durationMs: result.durationMs,
                          timestamp: Date.now(),
                        });

                        // Return response to Live API session
                        if (result.success && result.svgMarkup) {
                          session.sendToolResponse({
                            functionResponses: [
                              {
                                id: call.id,
                                name: call.name,
                                response: {
                                  status: 'success',
                                  topic,
                                  output: `Educational diagram for "${topic}" generated and displayed in the student's visual panel. Now explain the visual to the child and point out the key labelled parts.`,
                                },
                              },
                            ],
                          });
                        } else {
                          session.sendToolResponse({
                            functionResponses: [
                              {
                                id: call.id,
                                name: call.name,
                                response: {
                                  status: 'error',
                                  error: result.error || 'Failed to generate SVG visual.',
                                },
                              },
                            ],
                          });
                        }
                      } else if (call.name === 'image_generator') {
                        const callArgs = (call.args || {}) as {
                          prompt?: string;
                          topic?: string;
                          targetClass?: string;
                        };

                        const topic = callArgs.topic || 'Visual Concept';
                        const prompt = callArgs.prompt || topic;
                        const targetClass = callArgs.targetClass || currentTargetClass || 'Class 2';

                        // 1. Immediately inform client that image tool has started
                        sendToClient({
                          type: 'tool_call_start',
                          callId: call.id,
                          name: call.name,
                          visualType: 'image',
                          args: { topic, targetClass, prompt, description: prompt },
                          timestamp: Date.now(),
                        });

                        // 2. Ultra-fast Live response (<5ms): Immediately unblock Gemini Live voice!
                        // This prevents Gemini Live from pausing or freezing for 58s while graphics render.
                        try {
                          session.sendToolResponse({
                            functionResponses: [
                              {
                                id: call.id,
                                name: call.name,
                                response: {
                                  status: 'success',
                                  topic,
                                  output: `Educational illustration for "${topic}" is being rendered on the student's visual panel right now. Tell the child cheerfully what you are illustrating and guide them through the concept while the picture appears!`,
                                },
                              },
                            ],
                          });
                        } catch (toolRespErr) {
                          console.warn('Failed to send instant tool response to Gemini Live:', toolRespErr);
                        }

                        // 3. Asynchronously execute image generation with Nano Banana 2 & 1.5s fast fallback
                        executeImageGenerator(svgAi, {
                          prompt,
                          topic,
                          targetClass,
                        })
                          .then((result) => {
                            sendToClient({
                              type: 'tool_call_result',
                              callId: call.id,
                              name: call.name,
                              visualType: result.imageUrl ? 'image' : 'svg',
                              args: { topic, targetClass, prompt, description: prompt },
                              success: result.success,
                              imageUrl: result.imageUrl,
                              svgMarkup: result.svgFallback,
                              error: result.error,
                              durationMs: result.durationMs,
                              timestamp: Date.now(),
                            });
                          })
                          .catch((genErr: unknown) => {
                            const errText = genErr instanceof Error ? genErr.message : String(genErr);
                            console.error('Async image generation error:', errText);
                            sendToClient({
                              type: 'tool_call_result',
                              callId: call.id,
                              name: call.name,
                              visualType: 'image',
                              args: { topic, targetClass, prompt, description: prompt },
                              success: false,
                              error: errText,
                              durationMs: 0,
                              timestamp: Date.now(),
                            });
                          });
                      } else {
                        // Unknown tool fallback
                        session.sendToolResponse({
                          functionResponses: [
                            {
                              id: call.id,
                              name: call.name,
                              response: {
                                error: `Tool ${call.name} is not available in this teaching session.`,
                              },
                            },
                          ],
                        });
                      }
                    }
                  }

                  // 7. Usage metadata
                  if (serverMsg.usageMetadata) {
                    sendToClient({
                      type: 'usage_metadata',
                      usage: serverMsg.usageMetadata,
                    });
                  }
                } catch (msgErr: unknown) {
                  const errorMsg = msgErr instanceof Error ? msgErr.message : String(msgErr);
                  console.error('Error handling LiveServerMessage:', errorMsg);
                }
              },
              onerror: (err: any) => {
                console.error('Live session callback error:', err);
                sendToClient({
                  type: 'session_error',
                  error: err?.message || String(err),
                });
              },
              onclose: (closeEvent: any) => {
                console.log('Live session callback closed:', closeEvent);
                if (!isClosing) {
                  sendToClient({
                    type: 'session_closed',
                    reason: closeEvent?.reason || 'Live API session closed.',
                  });
                }
              },
            },
          });

          activeLiveSession = session;
          sendToClient({
            type: 'session_status',
            status: 'connected',
          });

          // As soon as Live session is established, AI teacher proactively addresses the student
          try {
            const childGreeting = msg.childName ? ` Address the student as "${msg.childName}".` : '';
            session.sendClientContent({
              turns: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `[SYSTEM KICKOFF: The live lesson has just begun. Speak first immediately! Warmly greet the student as Truncky, the friendly elephant teacher.${childGreeting} Speak in the configured language(s) with joyful enthusiasm, introduce yourself briefly, and ask an inviting, friendly opening question suitable for ${currentTargetClass} to start today's lesson!]`,
                    },
                  ],
                },
              ],
              turnComplete: true,
            });
          } catch (kickoffErr) {
            console.warn('Could not send initial teacher kickoff greeting:', kickoffErr);
          }
        } catch (connErr: unknown) {
          const errorMsg = connErr instanceof Error ? connErr.message : String(connErr);
          console.error('Failed to connect to Live API:', errorMsg);
          sendToClient({
            type: 'session_error',
            error: `Failed to connect to Gemini Live: ${errorMsg}`,
          });
        }
      } else if (msg.type === 'realtime_audio') {
        if (activeLiveSession && msg.data) {
          activeLiveSession.sendRealtimeInput({
            audio: {
              data: msg.data,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        }
      } else if (msg.type === 'audio_stream_end') {
        if (activeLiveSession) {
          activeLiveSession.sendRealtimeInput({
            audioStreamEnd: true,
          });
        }
      } else if (msg.type === 'send_text') {
        if (activeLiveSession && msg.text) {
          teacherTurnCompleted = true;
          studentTurnCompleted = true;
          activeLiveSession.sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [{ text: msg.text }],
              },
            ],
            turnComplete: true,
          });
        }
      } else if (msg.type === 'update_target_class') {
        if (msg.targetClass) {
          currentTargetClass = msg.targetClass;
        }
      } else if (msg.type === 'update_system_prompt') {
        if (msg.systemPrompt) {
          console.log('Synchronized updated child preferences system prompt');
        }
      } else if (msg.type === 'update_max_output_tokens') {
        if (typeof msg.maxOutputTokens === 'number') {
          currentMaxOutputTokens = msg.maxOutputTokens;
        }
      } else if (msg.type === 'stop_session') {
        isClosing = true;
        if (activeLiveSession) {
          try {
            activeLiveSession.close();
          } catch {}
          activeLiveSession = null;
        }
        sendToClient({
          type: 'session_status',
          status: 'disconnected',
        });
        isClosing = false;
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Client message error:', errorMsg);
      sendToClient({
        type: 'error',
        error: `Client message processing failed: ${errorMsg}`,
      });
    }
  });

  clientWs.on('close', () => {
    if (activeLiveSession) {
      try {
        activeLiveSession.close();
      } catch {}
      activeLiveSession = null;
    }
  });
});

// Setup Vite middleware in dev mode or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Teacher Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
