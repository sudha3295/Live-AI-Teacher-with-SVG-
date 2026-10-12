import React, { useState } from 'react';
import {
  Code,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  FileCode,
} from 'lucide-react';
import { ToolCallState } from '../types';

interface VisualPanelProps {
  latestSvg: string | null;
  toolCallState: ToolCallState;
  targetClass: string;
}

export const VisualPanel: React.FC<VisualPanelProps> = ({
  latestSvg,
  toolCallState,
  targetClass,
}) => {
  const [showSource, setShowSource] = useState(false);
  const [showDebugArgs, setShowDebugArgs] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleCopySource = () => {
    if (!latestSvg && !toolCallState.rawText) return;
    const textToCopy = latestSvg || toolCallState.rawText || '';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    if (!latestSvg) return;
    const blob = new Blob([latestSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(toolCallState.args.topic || 'teaching-visual').replace(/\s+/g, '-').toLowerCase()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = () => {
    switch (toolCallState.status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            Drawing in progress...
          </span>
        );
      case 'succeeded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Visual Rendered
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertTriangle className="h-3 w-3 text-rose-600" />
            Tool Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
            <span className="h-2 w-2 rounded-full bg-neutral-400" />
            Waiting for tool call
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-neutral-300 rounded-lg shadow-xs overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-3.5 sm:p-4 border-b border-neutral-200 bg-neutral-50/80">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-900">
                Visual Teaching Panel
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 bg-neutral-200/70 text-neutral-700 rounded">
                SVG Creator
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Permanently visible live canvas for educational line drawings & diagrams
            </p>
          </div>
          <div>{getStatusBadge()}</div>
        </div>

        {/* Status & Sub-meta */}
        <div className="mt-2.5 pt-2 border-t border-neutral-200 flex flex-wrap items-center justify-between text-xs text-neutral-600 gap-2">
          <div className="flex items-center gap-3">
            <span className="font-medium text-neutral-800">
              Target:{' '}
              <span className="font-semibold text-neutral-950">
                {toolCallState.args.targetClass || targetClass}
              </span>
            </span>
            {toolCallState.args.topic && (
              <span className="truncate max-w-[200px] text-neutral-700 bg-white px-2 py-0.5 rounded border border-neutral-200 font-mono text-[11px]">
                {toolCallState.args.topic}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {toolCallState.durationMs !== null && (
              <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 font-mono">
                <Clock className="h-3 w-3" />
                {toolCallState.durationMs}ms
              </span>
            )}

            {latestSvg && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="p-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 rounded"
                  title={isZoomed ? 'Fit to Canvas' : 'Expand Preview'}
                >
                  {isZoomed ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="p-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 rounded"
                  title="Download SVG file"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        className={`flex-1 min-h-0 relative bg-white overflow-hidden flex items-center justify-center p-4 border-b border-neutral-200 ${
          isZoomed ? 'p-2' : 'p-6'
        }`}
      >
        {latestSvg ? (
          <div
            className={`w-full h-full flex items-center justify-center select-none ${
              isZoomed ? 'scale-110' : ''
            } transition-transform [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto [&>svg]:mx-auto [&>svg]:drop-shadow-xs`}
            dangerouslySetInnerHTML={{ __html: latestSvg }}
          />
        ) : toolCallState.status === 'running' ? (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="p-3 bg-amber-50 rounded-full border border-amber-200 animate-spin">
              <Sparkles className="h-6 w-6 text-amber-600" />
            </div>
            <p className="text-sm font-semibold text-neutral-800">
              Teacher is illustrating "{toolCallState.args.topic || 'concept'}"...
            </p>
            <p className="text-xs text-neutral-500 max-w-sm">
              Creating age-appropriate educational SVG line drawing with labels.
            </p>
          </div>
        ) : toolCallState.status === 'failed' ? (
          <div className="flex flex-col items-center justify-center text-center p-6 max-w-md bg-rose-50/70 border border-rose-200 rounded-lg text-rose-900 space-y-2">
            <AlertTriangle className="h-8 w-8 text-rose-600" />
            <h4 className="text-sm font-bold">SVG Generation Error</h4>
            <p className="text-xs font-mono text-rose-800 whitespace-pre-wrap text-left bg-white/80 p-2.5 rounded border border-rose-200 w-full overflow-auto max-h-36">
              {toolCallState.error || 'The model did not return valid SVG markup.'}
            </p>
            <p className="text-[11px] text-rose-700">
              The teacher was notified of the error and will adjust or explain via words.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 text-neutral-400 space-y-2">
            <div className="w-16 h-16 rounded-xl border-2 border-dashed border-neutral-300 flex items-center justify-center text-neutral-300">
              <FileCode className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium text-neutral-600">
              No visual generated yet
            </p>
            <p className="text-xs text-neutral-500 max-w-xs">
              When the AI teacher explains a concept that benefits from a diagram, it will invoke the <strong>SVG Creator</strong> tool and render it live right here.
            </p>
          </div>
        )}
      </div>

      {/* Accordions for Inspection & Observability */}
      <div className="shrink-0 divide-y divide-neutral-200 bg-neutral-50/50">
        {/* Accordion 1: Tool Call Arguments & Debugging */}
        <div>
          <button
            type="button"
            onClick={() => setShowDebugArgs(!showDebugArgs)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <span>Tool Arguments & Execution Context</span>
              {toolCallState.args.topic && (
                <span className="text-[10px] text-neutral-500 font-mono font-normal">
                  ({toolCallState.args.topic})
                </span>
              )}
            </span>
            {showDebugArgs ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showDebugArgs && (
            <div className="p-3 bg-neutral-900 text-neutral-100 font-mono text-[11px] space-y-2 border-t border-neutral-300">
              <div className="grid grid-cols-2 gap-2 text-neutral-400 border-b border-neutral-800 pb-2">
                <div>
                  <span className="text-neutral-500">Tool Name:</span>{' '}
                  <span className="text-neutral-200">svg_creator</span>
                </div>
                <div>
                  <span className="text-neutral-500">Status:</span>{' '}
                  <span className="text-neutral-200">{toolCallState.status}</span>
                </div>
                <div>
                  <span className="text-neutral-500">Call ID:</span>{' '}
                  <span className="text-neutral-300 truncate inline-block max-w-[120px]">
                    {toolCallState.callId || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Duration:</span>{' '}
                  <span className="text-neutral-200">
                    {toolCallState.durationMs ? `${toolCallState.durationMs} ms` : 'N/A'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-neutral-400 block mb-1">Parsed Arguments:</span>
                <pre className="bg-neutral-950 p-2 rounded overflow-x-auto text-emerald-400">
                  {JSON.stringify(toolCallState.args, null, 2)}
                </pre>
              </div>

              {toolCallState.error && (
                <div>
                  <span className="text-rose-400 block mb-1">Error Message:</span>
                  <pre className="bg-rose-950/60 p-2 rounded text-rose-300 whitespace-pre-wrap">
                    {toolCallState.error}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Accordion 2: Expandable SVG Source Code */}
        <div>
          <div className="px-4 py-2 flex items-center justify-between text-xs font-semibold text-neutral-700">
            <button
              type="button"
              onClick={() => setShowSource(!showSource)}
              className="flex items-center gap-1.5 hover:text-neutral-900 transition-colors flex-1 text-left"
            >
              <Code className="h-3.5 w-3.5 text-neutral-500" />
              <span>SVG Source Markup</span>
              <span className="text-[10px] text-neutral-400 font-mono font-normal">
                {latestSvg ? `${latestSvg.length} chars` : '0 chars'}
              </span>
              {showSource ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
            </button>

            {latestSvg && (
              <button
                type="button"
                onClick={handleCopySource}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 rounded transition-colors"
                title="Copy SVG markup"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            )}
          </div>

          {showSource && (
            <div className="p-3 bg-neutral-900 text-neutral-100 font-mono text-[11px] border-t border-neutral-300">
              <div className="max-h-48 overflow-auto bg-neutral-950 p-2 rounded border border-neutral-800">
                {latestSvg ? (
                  <pre className="whitespace-pre-wrap break-all text-neutral-300">
                    {latestSvg}
                  </pre>
                ) : toolCallState.rawText ? (
                  <pre className="whitespace-pre-wrap break-all text-neutral-400">
                    {toolCallState.rawText}
                  </pre>
                ) : (
                  <span className="text-neutral-500 italic">No SVG markup generated yet.</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
