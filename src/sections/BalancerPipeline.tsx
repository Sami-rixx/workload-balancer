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
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isActive = i <= currentIndex && step !== 'idle';
        const isCurrent = i === currentIndex && step !== 'idle' && step !== 'complete';

        return (
          <div key={s.key} className="flex items-center flex-1">
            <div
              className={`
                flex flex-col items-center gap-1 py-2 px-1 rounded-md flex-1
                transition-all duration-500 ease-out
                ${isCurrent ? 'bg-amber-500/10 ring-1 ring-amber-500/30' : ''}
                ${isActive && !isCurrent ? 'opacity-70' : 'opacity-40'}
              `}
            >
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center
                  transition-all duration-500
                  ${isActive
                    ? isCurrent
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-600'
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span
                className={`
                  text-[10px] font-medium leading-tight text-center
                  transition-colors duration-500
                  ${isActive ? 'text-slate-300' : 'text-slate-600'}
                `}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`
                  w-4 h-px transition-all duration-500 flex-shrink-0
                  ${i < currentIndex ? 'bg-emerald-500/40' : 'bg-slate-800'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
