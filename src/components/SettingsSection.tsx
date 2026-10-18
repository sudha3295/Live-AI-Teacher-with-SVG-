import React, { useState, useEffect } from 'react';
import { Settings, Sliders, RefreshCw, Check, Undo, Zap } from 'lucide-react';
import { SessionConfig } from '../types';

import { DEFAULT_TEACHER_PROMPT } from '../utils/prompts';
export { DEFAULT_TEACHER_PROMPT };

export const SUPPORTED_MODELS = [
  { id: 'gemini-3.8-live', label: 'Gemini 3.8 Live (Recommended)' },
  { id: 'gemini-3.8-live-extended-thinking', label: 'Gemini 3.8 Live (Extended Thinking)' },
];

export const SUPPORTED_VOICES = [
  { id: 'Zephyr', label: 'Zephyr (Warm & Friendly, Default Teacher)' },
  { id: 'Kore', label: 'Kore (Calm & Clear)' },
  { id: 'Puck', label: 'Puck (Playful & Energetic)' },
  { id: 'Charon', label: 'Charon (Deep & Steady)' },
  { id: 'Fenrir', label: 'Fenrir (Articulate & Confident)' },
  { id: 'Aoede', label: 'Aoede (Melodic & Expressive)' },
];

export const CLASS_LEVELS = [
  'Class 1',
  'Class 2',
  'Class 3',
  'Class 4',
  'Class 5',
];

export const TOKEN_WINDOW_PRESETS = [2048, 4096, 8192, 16384, 32768];

interface SettingsSectionProps {
  currentConfig: SessionConfig;
  effectiveConfig: SessionConfig | null;
  isConnected: boolean;
  onApplyConfig: (newConfig: SessionConfig) => void;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  currentConfig,
  effectiveConfig,
  isConnected,
  onApplyConfig,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formConfig, setFormConfig] = useState<SessionConfig>(currentConfig);
  const [justApplied, setJustApplied] = useState(false);

  useEffect(() => {
    setFormConfig(currentConfig);
  }, [currentConfig]);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyConfig(formConfig);
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 2000);
  };

  const handleResetToDefaultPrompt = () => {
    setFormConfig((prev) => ({ ...prev, systemPrompt: DEFAULT_TEACHER_PROMPT }));
  };

  return (
    <div className="bg-white border border-neutral-300 rounded-lg shadow-xs overflow-hidden">
      {/* Accordion Toggle Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left bg-neutral-50 hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 bg-neutral-200 text-neutral-800 rounded">
            <Settings className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
              Live Session Settings, VAD & Output Token Window
            </h3>
            <p className="text-[11px] text-neutral-500">
              Configure system prompt, voices, prefix/silence padding, target grade, and output token window limit
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-600">
          <span>{isOpen ? 'Collapse' : 'Configure'}</span>
          <Sliders className="h-3.5 w-3.5" />
        </div>
      </button>

      {/* Settings Form Body */}
      {isOpen && (
        <form onSubmit={handleApply} className="p-4 sm:p-5 border-t border-neutral-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Live Model */}
            <div>
              <label htmlFor="model-select" className="block text-xs font-semibold text-neutral-800 mb-1">
                Live Model
              </label>
              <select
                id="model-select"
                value={formConfig.model}
                onChange={(e) => setFormConfig({ ...formConfig, model: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-700"
              >
                {SUPPORTED_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Voice */}
            <div>
              <label htmlFor="voice-select" className="block text-xs font-semibold text-neutral-800 mb-1">
                Teacher Voice (Live Supported)
              </label>
              <select
                id="voice-select"
                value={formConfig.voice}
                onChange={(e) => setFormConfig({ ...formConfig, voice: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-700"
              >
                {SUPPORTED_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Class Level (Target Grade) */}
            <div>
              <label htmlFor="class-select" className="block text-xs font-semibold text-neutral-800 mb-1">
                Target Grade (Class 1–5)
              </label>
              <select
                id="class-select"
                value={formConfig.targetClass}
                onChange={(e) => setFormConfig({ ...formConfig, targetClass: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-700"
              >
                {CLASS_LEVELS.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Output Token Window (maxOutputTokens) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="token-window-select" className="block text-xs font-semibold text-neutral-800">
                  Output Token Window
                </label>
                <span className="text-[10px] font-mono text-neutral-500">maxOutputTokens</span>
              </div>
              <select
                id="token-window-select"
                value={formConfig.maxOutputTokens}
                onChange={(e) =>
                  setFormConfig({ ...formConfig, maxOutputTokens: Number(e.target.value) })
                }
                className="w-full bg-neutral-50 border border-neutral-300 rounded px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-700"
              >
                <option value={2048}>2,048 tokens (Compact)</option>
                <option value={4096}>4,096 tokens (Standard)</option>
                <option value={8192}>8,192 tokens (Recommended for Rich SVGs)</option>
                <option value={16384}>16,384 tokens (High Capacity)</option>
                <option value={32768}>32,768 tokens (Maximum Window)</option>
              </select>
            </div>
          </div>

          {/* Quick presets & description for Output Token Window */}
          <div className="bg-neutral-50 border border-neutral-200 rounded p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-600" />
                LLM Output Token Window Budget:
                <span className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs">
                  {formConfig.maxOutputTokens.toLocaleString()} tokens
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-neutral-500">Quick Select:</span>
                {TOKEN_WINDOW_PRESETS.map((tokens) => (
                  <button
                    key={tokens}
                    type="button"
                    onClick={() => setFormConfig({ ...formConfig, maxOutputTokens: tokens })}
                    className={`px-2 py-0.5 text-[11px] rounded font-mono transition-colors ${
                      formConfig.maxOutputTokens === tokens
                        ? 'bg-neutral-900 text-white font-bold'
                        : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {tokens >= 1024 ? `${tokens / 1024}k` : tokens}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-neutral-600">
              Allocates the maximum generation token limit for SVG diagrams and teacher responses. Increase this token window whenever you need more complex, multi-element illustrations to prevent truncation.
            </p>
          </div>

          {/* VAD Settings (Prefix padding & Silence padding) */}
          <div className="bg-neutral-50 border border-neutral-200 rounded p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-800">
                Voice Activity Detection (VAD) Timings
              </span>
              <span className="text-[11px] text-neutral-500 font-mono">
                API schema: automaticActivityDetection
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Prefix Padding */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="prefix-pad" className="text-xs font-medium text-neutral-700">
                    Prefix Padding:
                  </label>
                  <span className="text-xs font-mono font-semibold text-neutral-900">
                    {formConfig.prefixPaddingMs} ms
                  </span>
                </div>
                <input
                  id="prefix-pad"
                  type="range"
                  min={50}
                  max={1000}
                  step={50}
                  value={formConfig.prefixPaddingMs}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, prefixPaddingMs: Number(e.target.value) })
                  }
                  className="w-full accent-neutral-800 cursor-pointer"
                />
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Duration of detected speech required before start-of-speech is committed.
                </p>
              </div>

              {/* Silence Padding */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="silence-pad" className="text-xs font-medium text-neutral-700">
                    Silence Padding:
                  </label>
                  <span className="text-xs font-mono font-semibold text-neutral-900">
                    {formConfig.silenceDurationMs} ms
                  </span>
                </div>
                <input
                  id="silence-pad"
                  type="range"
                  min={100}
                  max={2000}
                  step={100}
                  value={formConfig.silenceDurationMs}
                  onChange={(e) =>
                    setFormConfig({ ...formConfig, silenceDurationMs: Number(e.target.value) })
                  }
                  className="w-full accent-neutral-800 cursor-pointer"
                />
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Required silence duration before end-of-speech is committed and teacher responds.
                </p>
              </div>
            </div>
          </div>

          {/* Editable System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="system-prompt" className="text-xs font-semibold text-neutral-800">
                Teacher System Prompt
              </label>
              <button
                type="button"
                onClick={handleResetToDefaultPrompt}
                className="text-[11px] text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1"
                title="Reset to default teacher instructions"
              >
                <Undo className="h-3 w-3" />
                <span>Reset to Default</span>
              </button>
            </div>
            <textarea
              id="system-prompt"
              rows={4}
              value={formConfig.systemPrompt}
              onChange={(e) => setFormConfig({ ...formConfig, systemPrompt: e.target.value })}
              className="w-full font-mono text-xs bg-neutral-50 border border-neutral-300 rounded p-2.5 text-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-neutral-700"
            />
          </div>

          {/* Effective Configuration Display & Apply button */}
          <div className="pt-2 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
            {/* Effective Values sent to API */}
            <div className="text-xs text-neutral-600 flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-neutral-700">Effective API Config:</span>
              <span className="font-mono text-[11px] bg-neutral-100 px-2 py-0.5 rounded text-neutral-800">
                grade: {effectiveConfig?.targetClass || formConfig.targetClass}
              </span>
              <span className="font-mono text-[11px] bg-neutral-100 px-2 py-0.5 rounded text-neutral-800">
                token window: {(effectiveConfig?.maxOutputTokens || formConfig.maxOutputTokens).toLocaleString()}
              </span>
              <span className="font-mono text-[11px] bg-neutral-100 px-2 py-0.5 rounded text-neutral-800">
                model: {effectiveConfig?.model || formConfig.model}
              </span>
              <span className="font-mono text-[11px] bg-neutral-100 px-2 py-0.5 rounded text-neutral-800">
                prefix: {effectiveConfig?.prefixPaddingMs ?? formConfig.prefixPaddingMs}ms
              </span>
              <span className="font-mono text-[11px] bg-neutral-100 px-2 py-0.5 rounded text-neutral-800">
                silence: {effectiveConfig?.silenceDurationMs ?? formConfig.silenceDurationMs}ms
              </span>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-neutral-900 text-white rounded text-xs font-semibold hover:bg-neutral-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {justApplied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Config Applied!</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{isConnected ? 'Apply & Reconnect Session' : 'Apply Settings'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
