import type { WorkloadEntry } from '@/types/balancer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { UserCheck, AlertTriangle, TrendingUp } from 'lucide-react';

interface Props {
  workload: WorkloadEntry[];
}

function StatusIcon({ status }: { status: WorkloadEntry['status'] }) {
  switch (status) {
    case 'FULL':
      return <UserCheck size={14} style={{ color: 'var(--accent-pass)' }} />;
    case 'OVERLOAD':
      return <AlertTriangle size={14} style={{ color: 'var(--accent-fail)' }} />;
    case 'UNDERLOAD':
      return <TrendingUp size={14} style={{ color: 'var(--accent-warn)' }} />;
  }
}

function StatusLabel({ status }: { status: WorkloadEntry['status'] }) {
  switch (status) {
    case 'FULL':
      return <span className="font-mono text-xs" style={{ color: 'var(--accent-pass)' }}>Full</span>;
    case 'OVERLOAD':
      return <span className="font-mono text-xs" style={{ color: 'var(--accent-fail)' }}>Overload</span>;
    case 'UNDERLOAD':
      return <span className="font-mono text-xs" style={{ color: 'var(--accent-warn)' }}>Underload</span>;
  }
}

function getProgressColor(status: WorkloadEntry['status']): string {
  switch (status) {
    case 'FULL':
      return 'var(--accent-pass)';
    case 'OVERLOAD':
      return 'var(--accent-fail)';
    case 'UNDERLOAD':
      return 'var(--accent-warn)';
  }
}

export default function WorkloadSummary({ workload }: Props) {
  if (workload.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="var(--text-muted)" strokeWidth="1.5" />
            <path d="M10 6v5M10 13.5v.5" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            No workload data yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Run the balancer to see teacher workload distribution
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ScrollArea className="max-h-[300px]">
        <div className="flex flex-col gap-2">
          {workload.map((w) => {
            const pct = Math.min(100, Math.max(0, (w.used / w.max) * 100));
            const isOverloaded = w.used > w.max;
            const barColor = getProgressColor(w.status);

            return (
              <div
                key={w.teacher_id}
                className="panel-raised p-3 flex flex-col gap-2 fade-in-up"
              >
                {/* Top row: name + status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusIcon status={w.status} />
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {w.teacher_name}
                    </span>
                    <span className="font-mono text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {w.teacher_id}
                    </span>
                  </div>
                  <StatusLabel status={w.status} />
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--border-subtle)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pct}%`,
                          background: barColor,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs tabular-nums flex-shrink-0">
                    <span
                      className="font-semibold"
                      style={{ color: isOverloaded ? 'var(--accent-fail)' : 'var(--text-primary)' }}
                    >
                      {w.used}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>/</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{w.max}</span>
                  </div>
                </div>

                {/* Remaining hint */}
                {w.remaining !== 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {w.remaining > 0
                      ? `${w.remaining} periods remaining`
                      : `${Math.abs(w.remaining)} periods over capacity`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
