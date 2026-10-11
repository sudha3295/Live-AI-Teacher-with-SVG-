import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Cpu, Radio, Hash } from 'lucide-react';
import { UsageMetrics } from '../types';

interface DiagnosticsPanelProps {
  usage: UsageMetrics;
  cumulativeTokens: number;
  selectedModel: string;
  selectedVoice: string;
  connectionStatus: string;
  toolCallCount: number;
  lastToolStatus: string;
  lastToolDurationMs: number | null;
  lastApiError: string | null;
}

export const DiagnosticsPanel: React.FC<DiagnosticsPanelProps> = ({
  usage,
  cumulativeTokens,
  selectedModel,
  selectedVoice,
  connectionStatus,
  toolCallCount,
  lastToolStatus,
  lastToolDurationMs,
  lastApiError,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatToken = (val: number | undefined): string => {
    if (val === undefined || val === null) {
      return 'Not available from API';
    }
    return val.toLocaleString();
  };

  return (
    <div className="bg-white border border-neutral-300 rounded-lg shadow-xs overflow-hidden">
      {/* Header bar / Quick status preview */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-left bg-neutral-50 hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-neutral-600" />
          <span className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
            Live Token Metrics & Diagnostics
          </span>
          <span className="text-[11px] font-mono bg-neutral-200/80 px-2 py-0.5 rounded text-neutral-700">
            Total Tokens:{' '}
            {usage.totalTokenCount !== undefined
              ? usage.totalTokenCount.toLocaleString()
              : cumulativeTokens > 0
              ? cumulativeTokens.toLocaleString()
              : '0'}
          </span>
          {lastApiError && (
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              API Error
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <span>{isOpen ? 'Hide Diagnostics' : 'Show Diagnostics'}</span>
          {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {/* Expanded Diagnostics Content */}
      {isOpen && (
        <div className="p-4 border-t border-neutral-200 space-y-4 text-xs bg-neutral-50/30">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white p-2.5 rounded border border-neutral-200 shadow-2xs">
              <span className="text-[10px] text-neutral-500 uppercase font-semibold flex items-center gap-1">
                <Cpu className="h-3 w-3" /> Model & Voice
              </span>
              <p className="mt-1 font-mono text-xs font-bold text-neutral-900 truncate">
                {selectedModel}
              </p>
              <p className="text-[10px] text-neutral-600 font-mono">Voice: {selectedVoice}</p>
            </div>

            <div className="bg-white p-2.5 rounded border border-neutral-200 shadow-2xs">
              <span className="text-[10px] text-neutral-500 uppercase font-semibold flex items-center gap-1">
                <Radio className="h-3 w-3" /> Connection
              </span>
              <p className="mt-1 font-bold text-neutral-900 capitalize text-xs">
                {connectionStatus}
              </p>
              <p className="text-[10px] text-neutral-500">Live WebSocket</p>
            </div>

            <div className="bg-white p-2.5 rounded border border-neutral-200 shadow-2xs">
              <span className="text-[10px] text-neutral-500 uppercase font-semibold flex items-center gap-1">
                <Hash className="h-3 w-3" /> Tool Invocations
              </span>
              <p className="mt-1 font-mono text-xs font-bold text-neutral-900">
                {toolCallCount} calls
              </p>
              <p className="text-[10px] text-neutral-600 capitalize">
                Last: {lastToolStatus || 'None'}
              </p>
            </div>

            <div className="bg-white p-2.5 rounded border border-neutral-200 shadow-2xs">
              <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                Cumulative Tokens
              </span>
              <p className="mt-1 font-mono text-xs font-bold text-neutral-900">
                {cumulativeTokens.toLocaleString()}
              </p>
              <p className="text-[10px] text-neutral-500 font-mono">
                Duration: {lastToolDurationMs ? `${lastToolDurationMs}ms` : '—'}
              </p>
            </div>
          </div>

          {/* Detailed Token Breakdown Table */}
          <div className="bg-white border border-neutral-200 rounded overflow-hidden shadow-2xs">
            <div className="px-3 py-2 bg-neutral-100/70 border-b border-neutral-200 font-semibold text-neutral-800 text-[11px] flex justify-between">
              <span>Token Usage Breakdown</span>
              <span className="text-neutral-500 font-normal">Actual API usageMetadata</span>
            </div>

            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-neutral-200">
                <tr className="hover:bg-neutral-50">
                  <td className="px-3 py-1.5 text-neutral-600 font-medium">Input Tokens (Prompt)</td>
                  <td className="px-3 py-1.5 font-mono text-right font-semibold text-neutral-900">
                    {formatToken(usage.promptTokenCount)}
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50">
                  <td className="px-3 py-1.5 text-neutral-600 font-medium">Output Tokens (Response)</td>
                  <td className="px-3 py-1.5 font-mono text-right font-semibold text-neutral-900">
                    {formatToken(usage.candidatesTokenCount)}
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50">
                  <td className="px-3 py-1.5 text-neutral-600 font-medium pl-6">↳ Audio Input Tokens</td>
                  <td className="px-3 py-1.5 font-mono text-right text-neutral-700">
                    {formatToken(usage.audioInputTokens)}
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50">
                  <td className="px-3 py-1.5 text-neutral-600 font-medium pl-6">↳ Audio Output Tokens</td>
                  <td className="px-3 py-1.5 font-mono text-right text-neutral-700">
                    {formatToken(usage.audioOutputTokens)}
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50">
                  <td className="px-3 py-1.5 text-neutral-600 font-medium pl-6">↳ Text Input Tokens</td>
                  <td className="px-3 py-1.5 font-mono text-right text-neutral-700">
                    {formatToken(usage.textInputTokens)}
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50">
                  <td className="px-3 py-1.5 text-neutral-600 font-medium pl-6">↳ Text Output Tokens</td>
                  <td className="px-3 py-1.5 font-mono text-right text-neutral-700">
                    {formatToken(usage.textOutputTokens)}
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50">
                  <td className="px-3 py-1.5 text-neutral-600 font-medium">Cached Context Tokens</td>
                  <td className="px-3 py-1.5 font-mono text-right text-neutral-700">
                    {formatToken(usage.cachedContentTokenCount)}
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50">
                  <td className="px-3 py-1.5 text-neutral-600 font-medium">Thinking / Reasoning Tokens</td>
                  <td className="px-3 py-1.5 font-mono text-right text-neutral-700">
                    {formatToken(usage.thoughtsTokenCount)}
                  </td>
                </tr>
                <tr className="bg-neutral-50 font-bold">
                  <td className="px-3 py-2 text-neutral-900">Turn Total Tokens</td>
                  <td className="px-3 py-2 font-mono text-right text-neutral-950">
                    {formatToken(usage.totalTokenCount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Error Banner if any */}
          {lastApiError && (
            <div className="bg-rose-50 border border-rose-200 rounded p-2.5 text-rose-900 text-xs">
              <span className="font-bold">Latest Error:</span>
              <pre className="mt-1 font-mono text-[11px] whitespace-pre-wrap text-rose-800">
                {lastApiError}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
