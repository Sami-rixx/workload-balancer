import type { ShortfallEntry } from '@/types/balancer';
import { AlertCircle } from 'lucide-react';

interface Props {
  shortfalls: ShortfallEntry[];
  totalShortfall: number;
}

export default function ShortfallBucket({ shortfalls, totalShortfall }: Props) {
  if (shortfalls.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-xs text-emerald-400">No shortfalls — all slots assigned</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-red-500/5 border border-red-500/10">
        <AlertCircle className="w-4 h-4 text-red-400" />
        <span className="text-xs text-red-400 font-medium">
          {shortfalls.length} slot{shortfalls.length > 1 ? 's' : ''} unassigned — {totalShortfall} periods
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {shortfalls.map((s, i) => (
          <div
            key={`${s.subject_code}-${s.grade}-${i}`}
            className="flex items-center justify-between py-1.5 px-3 rounded bg-slate-800/30 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-300">{s.subject_code}</span>
              <span className="text-slate-500">{s.grade}</span>
            </div>
            <span className="text-red-400 font-medium tabular-nums">{s.periods_unmet} periods</span>
          </div>
        ))}
      </div>
    </div>
  );
}
