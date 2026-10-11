import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
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
    const { model, systemPrompt, prompt } = req.body;
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Live WebSocket connections
wss.on('connection', (clientWs: WebSocket) => {
  let activeLiveSession: any = null;
  let isClosing = false;
  let currentTargetClass = 'Class 2';

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
        const systemPrompt = msg.systemPrompt || '';
        const prefixPaddingMs = typeof msg.prefixPaddingMs === 'number' ? msg.prefixPaddingMs : 300;
        const silenceDurationMs = typeof msg.silenceDurationMs === 'number' ? msg.silenceDurationMs : 500;
        currentTargetClass = msg.targetClass || 'Class 2';

        sendToClient({
          type: 'session_status',
          status: 'connecting',
          effectiveConfig: {
            model,
            voice,
            targetClass: currentTargetClass,
            prefixPaddingMs,
            silenceDurationMs,
            systemPromptLength: systemPrompt.length,
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
              systemInstruction: systemPrompt,
              realtimeInputConfig: {
                automaticActivityDetection: {
                  prefixPaddingMs,
                  silenceDurationMs,
                },
              },
              outputAudioTranscription: {},
              inputAudioTranscription: {},
              tools: [
                {
                  functionDeclarations: [svgCreatorFunctionDeclaration],
                },
              ],
            },
            callbacks: {
              onmessage: async (serverMsg: LiveServerMessage) => {
                try {
                  // 1. Process server content parts (audio & text)
                  const parts = serverMsg.serverContent?.modelTurn?.parts || [];
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      sendToClient({
                        type: 'audio',
                        data: part.inlineData.data,
                      });
                    }
                    if (part.text) {
                      sendToClient({
                        type: 'transcript_teacher',
                        text: part.text,
                      });
                    }
                  }

                  // 2. Output audio transcription (words spoken by the teacher model)
                  // @ts-ignore
                  const outTrans = serverMsg.outputTranscription || serverMsg.serverContent?.outputTranscription;
                  if (outTrans?.text) {
                    sendToClient({
                      type: 'transcript_teacher',
                      text: outTrans.text,
                      finished: !!outTrans.finished,
                    });
                  }

                  // 3. Input audio transcription (words spoken by the child)
                  // @ts-ignore
                  const inTrans = serverMsg.inputTranscription || serverMsg.serverContent?.inputTranscription;
                  if (inTrans?.text) {
                    sendToClient({
                      type: 'transcript_student',
                      text: inTrans.text,
                      finished: !!inTrans.finished,
                    });
                  }

                  // 4. Interrupted flag
                  if (serverMsg.serverContent?.interrupted) {
                    sendToClient({ type: 'interrupted' });
                  }

                  // 5. Turn completion
                  if (serverMsg.serverContent?.turnComplete) {
                    sendToClient({ type: 'turn_complete' });
                  }

                  // 6. Handle tool calls (SVG Creator)
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
                          args: { topic, targetClass, description },
                          timestamp: Date.now(),
                        });

                        // Execute the real SVG Creator with dedicated paid key
                        const result = await executeSvgCreator(svgAi, {
                          topic,
                          targetClass,
                          description,
                        });

                        // Inform client of result
                        sendToClient({
                          type: 'tool_call_result',
                          callId: call.id,
                          name: call.name,
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
                                  output: `Educational illustration for "${topic}" generated and shown in the student's visual panel. Now explain the visual to the child and point out the key labelled parts.`,
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
