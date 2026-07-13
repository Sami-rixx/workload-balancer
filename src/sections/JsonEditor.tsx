import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Play, RotateCcw, FileJson, AlertCircle, Check, Upload } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  isRunning: boolean;
  onLoadSample: () => void;
  onReset: () => void;
  parseError: string | null;
}

export default function JsonEditor({
  value,
  onChange,
  onRun,
  isRunning,
  onLoadSample,
  onReset,
  parseError,
}: Props) {
  const [isValidJson, setIsValidJson] = useState(true);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      onChange(text);
      try {
        if (text.trim()) {
          JSON.parse(text);
          setIsValidJson(true);
        }
      } catch {
        setIsValidJson(false);
      }
    },
    [onChange]
  );

  return (
    <div className="panel flex flex-col h-full" style={{ minHeight: 320 }}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-3 sm:px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileJson size={14} style={{ color: 'var(--brass)' }} />
          <span className="label-caps truncate">Payload Input</span>
          <span className="font-mono text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
            Gatechecker output
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadSample}
            className="h-7 text-xs touch-target"
            style={{ color: 'var(--text-muted)', background: 'transparent' }}
          >
            <Upload size={12} className="mr-1" />
            <span className="hidden sm:inline">Load Sample</span>
            <span className="sm:hidden">Sample</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 text-xs touch-target"
            style={{ color: 'var(--text-muted)', background: 'transparent' }}
          >
            <RotateCcw size={12} className="mr-1" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="relative flex-1 min-h-0 p-3 sm:p-4">
        <Textarea
          value={value}
          onChange={handleChange}
          className="h-full min-h-[200px] resize-none font-mono text-xs sm:text-sm leading-relaxed border-none outline-none"
          style={{
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-sm)',
          }}
          spellCheck={false}
          placeholder="Paste your school's validated payload here to begin balancing..."
        />
      </div>

      {/* Status bar */}
      <div
        className="px-3 sm:px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {parseError ? (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--accent-fail)' }}>
              <AlertCircle size={14} />
              <span className="font-mono truncate">{parseError}</span>
            </div>
          ) : value.trim() && isValidJson ? (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--accent-pass)' }}>
              <Check size={14} />
              <span>Valid JSON</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>Enter a canonical payload</span>
            </div>
          )}
        </div>

        <Button
          onClick={onRun}
          disabled={isRunning || !isValidJson || !value.trim()}
          className="h-10 font-display text-sm font-semibold uppercase tracking-wider touch-target disabled:opacity-40"
          style={{
            background: 'var(--brass)',
            color: 'var(--ink)',
          }}
        >
          {isRunning ? (
            <>
              <svg className="spin-slow mr-2" width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5A5.5 5.5 0 001.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M7 12.5A5.5 5.5 0 0012.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
              </svg>
              Balancing...
            </>
          ) : (
            <>
              <Play size={15} className="mr-1.5" />
              Run Balancer
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
