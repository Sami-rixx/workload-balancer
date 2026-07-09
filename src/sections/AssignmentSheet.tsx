import type { AssignmentRow } from '@/types/balancer';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, UserX } from 'lucide-react';

interface Props {
  assignments: AssignmentRow[];
}

function StatusBadge({ status }: { status: AssignmentRow['status'] }) {
  switch (status) {
    case 'Assigned':
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-medium border-0">
          Assigned
        </Badge>
      );
    case 'Assigned-Overload':
      return (
        <Badge className="bg-amber-500/15 text-amber-400 hover:bg-amber-500/20 text-[10px] font-medium border-0">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Overload
        </Badge>
      );
    case 'Unassigned':
      return (
        <Badge className="bg-red-500/15 text-red-400 hover:bg-red-500/20 text-[10px] font-medium border-0">
          <UserX className="w-3 h-3 mr-1" />
          Unassigned
        </Badge>
      );
  }
}

export default function AssignmentSheet({ assignments }: Props) {
  if (assignments.length === 0) {
    return (
      <div className="text-center py-8 text-slate-600 text-sm">
        Run the balancer to generate assignments
      </div>
    );
  }

  const assigned = assignments.filter((a) => a.status === 'Assigned');
  const overloaded = assignments.filter((a) => a.status === 'Assigned-Overload');
  const unassigned = assignments.filter((a) => a.status === 'Unassigned');

  return (
    <div className="flex flex-col gap-3">
      {/* Summary stats */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-slate-400">{assigned.length} assigned</span>
        </div>
        {overloaded.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-400">{overloaded.length} overloaded</span>
          </div>
        )}
        {unassigned.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-slate-400">{unassigned.length} unassigned</span>
          </div>
        )}
      </div>

      {/* Table */}
      <ScrollArea className="max-h-[340px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-800">
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Subject</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Grade</th>
              <th className="text-center py-2 px-2 text-slate-500 font-medium">Periods</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Teacher</th>
              <th className="text-center py-2 px-2 text-slate-500 font-medium">Prio</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a, i) => (
              <tr
                key={`${a.subject_code}-${a.grade}-${i}`}
                className={`
                  border-b border-slate-800/50 transition-colors hover:bg-slate-800/30
                  ${a.status === 'Unassigned' ? 'bg-red-500/5' : ''}
                  ${a.status === 'Assigned-Overload' ? 'bg-amber-500/5' : ''}
                `}
              >
                <td className="py-1.5 px-2 text-slate-300 font-medium">{a.subject_code}</td>
                <td className="py-1.5 px-2 text-slate-400">{a.grade}</td>
                <td className="py-1.5 px-2 text-center text-slate-400">{a.periods}</td>
                <td className="py-1.5 px-2 text-slate-300">
                  {a.teacher_name ?? (
                    <span className="text-red-400 italic">—</span>
                  )}
                </td>
                <td className="py-1.5 px-2 text-center">
                  {a.priority_used !== null ? (
                    <span
                      className={`
                        inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold
                        ${a.priority_used === 1 ? 'bg-emerald-500/20 text-emerald-400' : ''}
                        ${a.priority_used === 2 ? 'bg-amber-500/20 text-amber-400' : ''}
                        ${a.priority_used === 3 ? 'bg-red-500/20 text-red-400' : ''}
                      `}
                    >
                      {a.priority_used}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="py-1.5 px-2">
                  <StatusBadge status={a.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}
