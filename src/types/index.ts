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
}
