import type { AssignmentRow } from '@/types/balancer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, UserX } from 'lucide-react';

interface Props {
  assignments: AssignmentRow[];
}

function StatusBadge({ status }: { status: AssignmentRow['status'] }) {
  switch (status) {
    case 'Assigned':
      return (
        <span
          className="font-mono text-xs px-2 py-0.5 rounded-sm"
          style={{ background: 'rgba(107, 168, 138, 0.12)', color: 'var(--accent-pass)' }}
        >
          Assigned
        </span>
      );
    case 'Assigned-Overload':
      return (
        <span
          className="font-mono text-xs px-2 py-0.5 rounded-sm inline-flex items-center gap-1"
          style={{ background: 'rgba(201, 169, 110, 0.12)', color: 'var(--accent-warn)' }}
        >
          <AlertTriangle size={10} />
          Overload
        </span>
      );
    case 'Unassigned':
      return (
        <span
          className="font-mono text-xs px-2 py-0.5 rounded-sm inline-flex items-center gap-1"
          style={{ background: 'rgba(184, 107, 107, 0.12)', color: 'var(--accent-fail)' }}
        >
          <UserX size={10} />
          Unassigned
        </span>
      );
  }
}

function PriorityBadge({ priority }: { priority: number | null }) {
  if (priority === null) return <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>—</span>;

  const colors = {
    1: { bg: 'rgba(107, 168, 138, 0.12)', text: 'var(--accent-pass)', label: 'Preferred' },
    2: { bg: 'rgba(90, 122, 150, 0.1)', text: 'var(--accent-slate)', label: 'Normal' },
    3: { bg: 'rgba(201, 169, 110, 0.1)', text: 'var(--accent-warn)', label: 'Last Resort' },
  };
  const c = colors[priority as keyof typeof colors] || colors[2];

  return (
    <span
      className="font-mono text-xs font-medium px-1.5 py-0.5 rounded-sm"
      style={{ background: c.bg, color: c.text }}
      title={c.label}
    >
      P{priority}
    </span>
  );
}

/* Ring confidence indicator (Möbius eye motif) */
function ConfidenceDot({ confidence }: { confidence: number }) {
  const getColor = (v: number) => {
    if (v >= 0.8) return 'var(--accent-pass)';
    if (v >= 0.5) return 'var(--accent-warn)';
    return 'var(--accent-fail)';
  };

  const color = getColor(confidence);

  return (
    <div className="flex items-center gap-1.5">
      <svg width="20" height="20" viewBox="0 0 20 20">
        <circle cx="10" cy="10" r="8" stroke="var(--border-subtle)" strokeWidth="2" fill="none" />
        <circle
          cx="10"
          cy="10"
          r="8"
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeDasharray={`${confidence * 50.27} 50.27`}
          strokeLinecap="round"
          transform="rotate(-90 10 10)"
          style={{ transition: 'stroke-dasharray 600ms ease-out' }}
        />
        <circle cx="10" cy="10" r="3" fill={color} opacity="0.4" />
      </svg>
      <span className="font-mono text-xs tabular-nums" style={{ color }}>
        {(confidence * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export default function AssignmentSheet({ assignments }: Props) {
  if (assignments.length === 0) {
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
            No assignments yet
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Run the balancer to generate teacher assignments
          </p>
        </div>
      </div>
    );
  }

  const assigned = assignments.filter((a) => a.status === 'Assigned');
  const overloaded = assignments.filter((a) => a.status === 'Assigned-Overload');
  const unassigned = assignments.filter((a) => a.status === 'Unassigned');

  return (
    <div className="flex flex-col gap-3">
      {/* Summary stats */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-pass)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>{assigned.length} assigned</span>
        </div>
        {overloaded.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-warn)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>{overloaded.length} overloaded</span>
          </div>
        )}
        {unassigned.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-fail)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>{unassigned.length} unassigned</span>
          </div>
        )}
      </div>

      {/* Desktop: Table / Mobile: Stacked cards */}
      <ScrollArea className="max-h-[380px]">
        {/* Desktop table (hidden on small screens) */}
        <table className="hidden sm:table w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <th className="text-left py-2 px-2 font-mono font-medium" style={{ color: 'var(--text-muted)' }}>Subject</th>
              <th className="text-left py-2 px-2 font-mono font-medium" style={{ color: 'var(--text-muted)' }}>Grade</th>
              <th className="text-center py-2 px-2 font-mono font-medium" style={{ color: 'var(--text-muted)' }}>Periods</th>
              <th className="text-left py-2 px-2 font-mono font-medium" style={{ color: 'var(--text-muted)' }}>Teacher</th>
              <th className="text-center py-2 px-2 font-mono font-medium" style={{ color: 'var(--text-muted)' }}>Prio</th>
              <th className="text-left py-2 px-2 font-mono font-medium" style={{ color: 'var(--text-muted)' }}>Status</th>
              <th className="text-right py-2 px-2 font-mono font-medium" style={{ color: 'var(--text-muted)' }}>Conf</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a, i) => (
              <tr
                key={`${a.subject_code}-${a.grade}-${i}`}
                className="transition-colors hover:bg-white/[0.02]"
                style={{ borderBottom: '1px solid rgba(26, 37, 80, 0.4)' }}
              >
                <td className="py-2 px-2 font-medium" style={{ color: 'var(--text-primary)' }}>{a.subject_code}</td>
                <td className="py-2 px-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{a.grade}</td>
                <td className="py-2 px-2 text-center font-mono tabular-nums" style={{ color: 'var(--text-secondary)' }}>{a.periods}</td>
                <td className="py-2 px-2" style={{ color: 'var(--text-primary)' }}>
                  {a.teacher_name ?? <span style={{ color: 'var(--accent-fail)' }}>—</span>}
                </td>
                <td className="py-2 px-2 text-center">
                  <PriorityBadge priority={a.priority_used} />
                </td>
                <td className="py-2 px-2">
                  <StatusBadge status={a.status} />
                </td>
                <td className="py-2 px-2">
                  <ConfidenceDot confidence={a.confidence} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile cards (visible only on small screens) */}
        <div className="sm:hidden flex flex-col gap-2">
          {assignments.map((a, i) => (
            <div
              key={`${a.subject_code}-${a.grade}-${i}`}
              className="panel-raised p-3 fade-in-up flex flex-col gap-2"
              style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    {a.subject_code}
                  </span>
                  <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{a.grade}</span>
                  <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {a.periods}p
                  </span>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {a.teacher_name ?? <span style={{ color: 'var(--accent-fail)' }}>No teacher assigned</span>}
                </span>
                <PriorityBadge priority={a.priority_used} />
              </div>
              <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <ConfidenceDot confidence={a.confidence} />
                {a.flag_note && (
                  <span className="text-xs italic truncate max-w-[150px]" style={{ color: 'var(--text-muted)' }}>
                    {a.flag_note}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
