import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Play, RotateCcw, FileJson, AlertCircle, Check } from 'lucide-react';

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
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileJson className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-200">Payload Input</h2>
          <span className="text-xs text-slate-500 ml-1">Gatechecker output</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadSample}
            className="h-7 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            Load Sample
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="relative flex-1 min-h-0">
        <Textarea
          value={value}
          onChange={handleChange}
          className="h-full resize-none font-mono text-xs leading-relaxed bg-slate-950 border-slate-800 text-slate-300 focus:border-amber-500/50 focus:ring-amber-500/20 rounded-lg p-4"
          spellCheck={false}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {parseError ? (
            <div className="flex items-center gap-1.5 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{parseError}</span>
            </div>
          ) : value.trim() && isValidJson ? (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
              <Check className="w-3.5 h-3.5" />
              <span>Valid JSON</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-600 text-xs">
              <span>Enter a canonical payload</span>
            </div>
          )}
        </div>

        <Button
          onClick={onRun}
          disabled={isRunning || !isValidJson || !value.trim()}
          className="h-8 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs px-4 disabled:opacity-40"
        >
          {isRunning ? (
            <>
              <div className="w-3 h-3 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin mr-2" />
              Balancing...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Run Balancer
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
