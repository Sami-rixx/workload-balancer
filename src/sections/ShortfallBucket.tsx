import type { ShortfallEntry } from '@/types/balancer';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  shortfalls: ShortfallEntry[];
  totalShortfall: number;
}

export default function ShortfallBucket({ shortfalls, totalShortfall }: Props) {
  if (shortfalls.length === 0) {
    return (
      <div
        className="flex items-center gap-3 py-3 px-4 rounded-sm"
        style={{
          background: 'rgba(107, 168, 138, 0.06)',
          border: '1px solid rgba(107, 168, 138, 0.15)',
        }}
      >
        <CheckCircle2 size={16} style={{ color: 'var(--accent-pass)', flexShrink: 0 }} />
        <div>
          <span className="text-sm font-medium" style={{ color: 'var(--accent-pass)' }}>
            No shortfalls
          </span>
          <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
            All slots were assigned successfully
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary banner */}
      <div
        className="flex items-center gap-3 py-3 px-4 rounded-sm"
        style={{
          background: 'rgba(184, 107, 107, 0.06)',
          border: '1px solid rgba(184, 107, 107, 0.15)',
        }}
      >
        <AlertCircle size={16} style={{ color: 'var(--accent-fail)', flexShrink: 0 }} />
        <div>
          <span className="text-sm font-medium" style={{ color: 'var(--accent-fail)' }}>
            {shortfalls.length} slot{shortfalls.length > 1 ? 's' : ''} unassigned
          </span>
          <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
            {totalShortfall} period{totalShortfall > 1 ? 's' : ''} without a teacher
          </span>
        </div>
      </div>

      {/* Shortfall entries */}
      <div className="flex flex-col gap-2">
        {shortfalls.map((s, i) => (
          <div
            key={`${s.subject_code}-${s.grade}-${i}`}
            className="panel-raised py-2.5 px-3 flex items-center justify-between fade-in-up"
            style={{ animationDelay: `${Math.min(i * 50, 250)}ms` }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {s.subject_name}
              </span>
              <span className="font-mono text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                {s.subject_code}
              </span>
              <span
                className="font-mono text-xs px-1.5 py-0.5 rounded-sm flex-shrink-0"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
              >
                {s.grade}
              </span>
            </div>
            <span className="font-mono text-xs font-medium tabular-nums flex-shrink-0" style={{ color: 'var(--accent-fail)' }}>
              {s.periods_unmet} periods
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
