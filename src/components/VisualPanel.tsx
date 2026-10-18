import React, { useState, useEffect } from 'react';
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
  Image as ImageIcon,
  Palette,
} from 'lucide-react';
import { ToolCallState } from '../types';

interface VisualPanelProps {
  latestSvg: string | null;
  latestImage?: string | null;
  toolCallState: ToolCallState;
  targetClass: string;
}

export const VisualPanel: React.FC<VisualPanelProps> = ({
  latestSvg,
  latestImage,
  toolCallState,
  targetClass,
}) => {
  const [showSource, setShowSource] = useState(false);
  const [showDebugArgs, setShowDebugArgs] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  // If both exist, allow toggling
  const [activeVisualTab, setActiveVisualTab] = useState<'svg' | 'image' | null>(null);

  useEffect(() => {
    if (toolCallState.status === 'running') {
      setElapsedSec(0);
      const timer = setInterval(() => {
        setElapsedSec((prev) => +(prev + 0.5).toFixed(1));
      }, 500);
      return () => clearInterval(timer);
    }
  }, [toolCallState.status]);

  // Determine current active visual to display
  const currentVisualType: 'svg' | 'image' | null =
    activeVisualTab ||
    (toolCallState.visualType === 'image' && latestImage
      ? 'image'
      : latestImage && !latestSvg
      ? 'image'
      : latestSvg
      ? 'svg'
      : latestImage
      ? 'image'
      : null);

  const isImageTool =
    toolCallState.name === 'image_generator' ||
    toolCallState.visualType === 'image' ||
    currentVisualType === 'image';

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

  const handleDownloadImage = () => {
    if (!latestImage) return;
    const a = document.createElement('a');
    a.href = latestImage;
    a.download = `${(toolCallState.args.topic || 'teaching-illustration').replace(/\s+/g, '-').toLowerCase()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getStatusBadge = () => {
    switch (toolCallState.status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            {toolCallState.name === 'image_generator' ? 'Generating picture...' : 'Drawing diagram...'}
          </span>
        );
      case 'succeeded':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Visual Ready
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <AlertTriangle className="h-3 w-3 text-rose-600" />
            Tool Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
            <span className="h-2 w-2 rounded-full bg-neutral-400" />
            Waiting for visual
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
              {isImageTool ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 rounded flex items-center gap-1">
                  <Palette className="h-3 w-3 text-purple-600" />
                  Nano Banana 2
                </span>
              ) : (
                <span className="text-[11px] font-mono px-2 py-0.5 bg-neutral-200/70 text-neutral-700 rounded">
                  SVG Creator
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Permanently visible canvas for educational diagrams, letter strokes & AI illustrations
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
            {/* Multi-visual selector if both SVG and Image exist */}
            {latestSvg && latestImage && (
              <div className="flex items-center bg-neutral-200/80 p-0.5 rounded text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveVisualTab('svg')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    currentVisualType === 'svg'
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  SVG
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVisualTab('image')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    currentVisualType === 'image'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Nano Banana
                </button>
              </div>
            )}

            {toolCallState.durationMs !== null && (
              <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 font-mono">
                <Clock className="h-3 w-3" />
                {toolCallState.durationMs}ms
              </span>
            )}

            {currentVisualType === 'svg' && latestSvg && (
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

            {currentVisualType === 'image' && latestImage && (
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
                  onClick={handleDownloadImage}
                  className="p-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 rounded"
                  title="Download Image"
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
        {currentVisualType === 'image' && latestImage ? (
          <div
            className={`w-full h-full flex flex-col items-center justify-center select-none ${
              isZoomed ? 'scale-105' : ''
            } transition-transform`}
          >
            <img
              src={latestImage}
              alt={toolCallState.args.topic || 'Educational Illustration'}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-full object-contain rounded-lg shadow-md border border-neutral-200"
            />
            <div className="mt-2 text-[11px] font-medium text-neutral-500 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
              <span>Created with Nano Banana 2 • High-clarity educational illustration</span>
            </div>
          </div>
        ) : currentVisualType === 'svg' && latestSvg ? (
          <div
            className={`w-full h-full flex items-center justify-center select-none ${
              isZoomed ? 'scale-110' : ''
            } transition-transform [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto [&>svg]:mx-auto [&>svg]:drop-shadow-xs`}
            dangerouslySetInnerHTML={{ __html: latestSvg }}
          />
        ) : toolCallState.status === 'running' ? (
          <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className={`p-3 rounded-full border animate-spin ${
              toolCallState.name === 'image_generator'
                ? 'bg-purple-50 border-purple-200 text-purple-600'
                : 'bg-amber-50 border-amber-200 text-amber-600'
            }`}>
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-800">
                {toolCallState.name === 'image_generator'
                  ? `Truncky is creating picture "${toolCallState.args.topic || 'concept'}"...`
                  : `Truncky is illustrating "${toolCallState.args.topic || 'concept'}"...`}
              </p>
              {toolCallState.name === 'image_generator' && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-ping" />
                  <span>Nano Banana 2: {elapsedSec}s (Target: ~3–5s)</span>
                </div>
              )}
            </div>
            <p className="text-xs text-neutral-500 max-w-sm">
              {toolCallState.name === 'image_generator'
                ? 'Generating high-clarity educational illustration (letter stroke guides / realistic picture art).'
                : 'Creating age-appropriate educational SVG line drawing with labels.'}
            </p>
          </div>
        ) : toolCallState.status === 'failed' ? (
          <div className="flex flex-col items-center justify-center text-center p-6 max-w-md bg-rose-50/70 border border-rose-200 rounded-lg text-rose-900 space-y-2">
            <AlertTriangle className="h-8 w-8 text-rose-600" />
            <h4 className="text-sm font-bold">Visual Generation Notice</h4>
            <p className="text-xs font-mono text-rose-800 whitespace-pre-wrap text-left bg-white/80 p-2.5 rounded border border-rose-200 w-full overflow-auto max-h-36">
              {toolCallState.error || 'The model did not return valid visual markup or image.'}
            </p>
            <p className="text-[11px] text-rose-700">
              Truncky was notified of the issue and will guide the child using spoken explanations.
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
              When Truncky explains a concept, it will automatically invoke the <strong>SVG Creator</strong> or <strong>Nano Banana 2 Image Generator</strong> and show it live here!
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
              {toolCallState.name && (
                <span className="text-[10px] text-neutral-500 font-mono font-normal">
                  ({toolCallState.name})
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
                  <span className="text-neutral-200">{toolCallState.name || 'svg_creator'}</span>
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
        {latestSvg && (
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
            </div>

            {showSource && (
              <div className="p-3 bg-neutral-900 text-neutral-100 font-mono text-[11px] border-t border-neutral-300">
                <div className="max-h-48 overflow-auto bg-neutral-950 p-2 rounded border border-neutral-800">
                  <pre className="whitespace-pre-wrap break-all text-neutral-300">
                    {latestSvg}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
