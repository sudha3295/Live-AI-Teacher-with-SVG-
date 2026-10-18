export interface ChatMessage {
  id: string;
  role: 'student' | 'teacher' | 'system' | 'tool';
  text: string;
  timestamp: number;
  isPartial?: boolean;
  toolDetails?: {
    callId: string;
    topic: string;
    targetClass?: string;
    description: string;
    status: 'running' | 'succeeded' | 'failed';
  };
}

export interface ToolCallState {
  status: 'idle' | 'running' | 'succeeded' | 'failed';
  name: string;
  callId: string;
  args: {
    topic: string;
    targetClass?: string;
    description: string;
  };
  svgMarkup: string | null;
  rawText: string | null;
  error: string | null;
  durationMs: number | null;
  usageMetadata: Record<string, unknown> | null;
  timestamp: number;
}

export interface ModalityDetail {
  modality: string;
  tokenCount: number;
}

export interface UsageMetrics {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  cachedContentTokenCount?: number;
  thoughtsTokenCount?: number;
  audioInputTokens?: number;
  audioOutputTokens?: number;
  textInputTokens?: number;
  textOutputTokens?: number;
  rawDetails?: Record<string, unknown>;
  lastUpdated?: number;
}

export interface SessionConfig {
  model: string;
  voice: string;
  targetClass: string;
  systemPrompt: string;
  prefixPaddingMs: number;
  silenceDurationMs: number;
  maxOutputTokens: number;
}

export interface TimelineMilestone {
  id: string;
  timestamp: number;
  type: 'concept' | 'visual' | 'question' | 'milestone';
  title: string;
  description: string;
  svgMarkup?: string;
  childQuestion?: string;
  teacherHighlight?: string;
}

export interface SessionVisual {
  callId: string;
  topic: string;
  targetClass?: string;
  description?: string;
  svgMarkup: string;
  timestamp: number;
}

export interface LearningSession {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  targetClass: string;
  title: string;
  summary: string;
  keyLearnings: string[];
  skillsCovered: string[];
  timeline: TimelineMilestone[];
  transcript: ChatMessage[];
  visuals: SessionVisual[];
  resumeContext: string;
  tokensUsed?: number;
}
