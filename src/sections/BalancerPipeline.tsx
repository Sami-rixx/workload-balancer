import type { BalancerStep } from '@/types/balancer';
import { Database, ListOrdered, UserCheck, GitBranch, ShieldCheck, Sparkles } from 'lucide-react';

const STEPS: { key: BalancerStep; label: string; icon: typeof Database }[] = [
  { key: 'building_maps', label: 'Build Maps', icon: Database },
  { key: 'ordering_slots', label: 'Order by Scarcity', icon: ListOrdered },
  { key: 'specialist_preassign', label: 'Pre-assign Specialists', icon: UserCheck },
  { key: 'assigning', label: 'Assign Slots', icon: GitBranch },
  { key: 'propagating', label: 'Propagate Confidence', icon: ShieldCheck },
  { key: 'complete', label: 'Complete', icon: Sparkles },
];

interface Props {
  step: BalancerStep;
}

export default function BalancerPipeline({ step }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isActive = i <= currentIndex && step !== 'idle';
        const isCurrent = i === currentIndex && step !== 'idle' && step !== 'complete';
        const isComplete = i < currentIndex && step !== 'idle';

        return (
          <div key={s.key} className="flex items-center flex-1 min-w-0">
            <div
              className={`
                flex flex-col items-center gap-1 py-2 px-1 flex-1 min-w-0
                transition-all duration-500 ease-out rounded-sm
                ${isCurrent ? 'ring-1' : ''}
              `}
              style={{
                background: isCurrent ? 'rgba(201, 169, 110, 0.08)' : 'transparent',
                borderColor: isCurrent ? 'var(--brass)' : 'transparent',
              }}
            >
              {/* Step icon */}
              <div
                className={`
                  w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center
                  transition-all duration-500 flex-shrink-0
                `}
                style={{
                  background: isActive
                    ? isCurrent
                      ? 'var(--brass)'
                      : 'rgba(107, 168, 138, 0.15)'
                    : 'var(--bg-surface-raised)',
                  color: isActive
                    ? isCurrent
                      ? 'var(--ink)'
                      : 'var(--accent-pass)'
                    : 'var(--text-muted)',
                }}
              >
                {isCurrent ? (
                  <svg className="spin-slow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1.5A6.5 6.5 0 001.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M8 14.5A6.5 6.5 0 0014.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
                  </svg>
                ) : (
                  <Icon size={14} />
                )}
              </div>

              {/* Step label */}
              <span
                className={`
                  text-[10px] sm:text-xs font-medium leading-tight text-center truncate w-full px-1
                  transition-colors duration-500
                `}
                style={{
                  color: isActive
                    ? isCurrent
                      ? 'var(--brass)'
                      : 'var(--accent-pass)'
                    : 'var(--text-muted)',
                  fontFamily: isCurrent ? "'Fraunces', Georgia, serif" : "'Inter', sans-serif",
                }}
              >
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.label.split(' ')[0]}</span>
              </span>
            </div>

            {/* Möbius flow connector */}
            {i < STEPS.length - 1 && (
              <div className="flex flex-col items-center flex-shrink-0 px-0.5">
                <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                  <path
                    d="M0 6 Q4 2, 8 6 Q12 10, 16 6"
                    stroke={isComplete ? 'var(--accent-pass)' : 'var(--border-subtle)'}
                    strokeWidth="1.5"
                    fill="none"
                    opacity={isComplete ? 0.5 : 0.3}
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
