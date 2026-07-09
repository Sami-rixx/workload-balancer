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
      return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
    case 'OVERLOAD':
      return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
    case 'UNDERLOAD':
      return <TrendingUp className="w-3.5 h-3.5 text-amber-400" />;
  }
}

function StatusLabel({ status }: { status: WorkloadEntry['status'] }) {
  switch (status) {
    case 'FULL':
      return <span className="text-emerald-400 font-medium">Full</span>;
    case 'OVERLOAD':
      return <span className="text-red-400 font-medium">Overload</span>;
    case 'UNDERLOAD':
      return <span className="text-amber-400 font-medium">Underload</span>;
  }
}

export default function WorkloadSummary({ workload }: Props) {
  if (workload.length === 0) {
    return (
      <div className="text-center py-8 text-slate-600 text-sm">
        Run the balancer to see workload distribution
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ScrollArea className="max-h-[280px]">
        <div className="flex flex-col gap-2">
          {workload.map((w) => {
            const pct = Math.min(100, Math.max(0, (w.used / w.max) * 100));
            const isOverloaded = w.used > w.max;

            return (
              <div
                key={w.teacher_id}
                className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-slate-800/30 border border-slate-800/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={w.status} />
                    <span className="text-sm font-medium text-slate-200">
                      {w.teacher_name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{w.teacher_id}</span>
                  </div>
                  <StatusLabel status={w.status} />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Progress
                      value={pct}
                      className="h-1.5 bg-slate-800"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] tabular-nums">
                    <span
                      className={`font-semibold ${isOverloaded ? 'text-red-400' : 'text-slate-300'}`}
                    >
                      {w.used}
                    </span>
                    <span className="text-slate-600">/</span>
                    <span className="text-slate-400">{w.max}</span>
                  </div>
                </div>

                {w.remaining !== 0 && (
                  <div className="text-[10px] text-slate-500">
                    {w.remaining > 0
                      ? `${w.remaining} periods remaining`
                      : `${Math.abs(w.remaining)} periods over capacity`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
