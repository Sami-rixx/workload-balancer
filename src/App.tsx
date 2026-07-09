import { useState, useCallback, useRef } from 'react';
import { Table2, Users, AlertTriangle, CheckCircle2, BarChart3, Scale } from 'lucide-react';
import JsonEditor from '@/sections/JsonEditor';
import BalancerPipeline from '@/sections/BalancerPipeline';
import AssignmentSheet from '@/sections/AssignmentSheet';
import WorkloadSummary from '@/sections/WorkloadSummary';
import ShortfallBucket from '@/sections/ShortfallBucket';
import { SAMPLE_DATA } from '@/engine/sampleData';
import { runBalancer } from '@/engine/balancer';
import type { CanonicalPayload, BalancerReport, BalancerStep } from '@/types/balancer';

const INITIAL_STEP: BalancerStep = 'idle';

export default function App() {
  const [jsonValue, setJsonValue] = useState(() => JSON.stringify(SAMPLE_DATA, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState<BalancerStep>(INITIAL_STEP);
  const [report, setReport] = useState<BalancerReport | null>(null);
  const abortRef = useRef(false);

  const handleRun = useCallback(async () => {
    let data: CanonicalPayload;
    try {
      data = JSON.parse(jsonValue);
      setParseError(null);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON');
      return;
    }

    setIsRunning(true);
    setReport(null);
    setStep('building_maps');
    abortRef.current = false;

    try {
      const result = await runBalancer(data, (progress) => {
        if (abortRef.current) return;
        setStep(progress.step);
      });

      if (!abortRef.current) {
        setReport(result);
        setStep(result.step);
      }
    } catch (e) {
      console.error('Balancer error:', e);
      setParseError(e instanceof Error ? e.message : 'Balancing failed');
    } finally {
      setIsRunning(false);
    }
  }, [jsonValue]);

  const handleLoadSample = useCallback(() => {
    setJsonValue(JSON.stringify(SAMPLE_DATA, null, 2));
    setParseError(null);
  }, []);

  const handleReset = useCallback(() => {
    setJsonValue('{}');
    setParseError(null);
    setReport(null);
    setStep(INITIAL_STEP);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 h-14 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <Scale className="w-4.5 h-4.5 text-slate-950" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-slate-100">
              Blueprint Workload Balancer
            </span>
            <span className="text-[10px] text-slate-500 leading-none">
              Tool 1 of 2 — Möbius Muse Timetable System
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-xs">
              {report.status === 'BALANCED' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Balanced</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-400 font-medium">Imbalanced</span>
                </>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] text-slate-500 bg-slate-800/50">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            v1.0
          </div>
        </div>
      </header>

      {/* Pipeline indicator */}
      <div className="flex-shrink-0 px-5 py-3 bg-slate-900/50 border-b border-slate-800">
        <BalancerPipeline step={step} />
      </div>

      {/* Main content */}
      <main className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left: JSON Input */}
        <div className="flex-1 min-w-0 max-w-[45%] bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col">
          <JsonEditor
            value={jsonValue}
            onChange={setJsonValue}
            onRun={handleRun}
            isRunning={isRunning}
            onLoadSample={handleLoadSample}
            onReset={handleReset}
            parseError={parseError}
          />
        </div>

        {/* Right: Results */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden max-w-[55%]">
          {/* Stats Row */}
          {report && (
            <div className="flex-shrink-0 grid grid-cols-4 gap-3">
              <StatCard
                icon={<BarChart3 className="w-4 h-4" />}
                label="Demand"
                value={`${report.total_demand}`}
                sub={`Supply: ${report.total_supply}`}
                accent="text-sky-400"
              />
              <StatCard
                icon={<CheckCircle2 className="w-4 h-4" />}
                label="Assigned"
                value={`${report.total_assigned}`}
                sub={`of ${report.total_demand} periods`}
                accent="text-emerald-400"
              />
              <StatCard
                icon={<AlertTriangle className="w-4 h-4" />}
                label="Shortfall"
                value={`${report.total_shortfall}`}
                sub={report.total_shortfall > 0 ? 'needs attention' : 'none'}
                accent={report.total_shortfall > 0 ? 'text-red-400' : 'text-emerald-400'}
              />
              <StatCard
                icon={<Users className="w-4 h-4" />}
                label="Overloads"
                value={`${report.overload_count}`}
                sub={report.overload_count > 0 ? 'capacity exceeded' : 'all clear'}
                accent={report.overload_count > 0 ? 'text-amber-400' : 'text-emerald-400'}
              />
            </div>
          )}

          {/* Results content */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-4">
            {/* Assignment Sheet */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Table2 className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-200">Assignment Sheet</h3>
                {report && (
                  <span className="text-[10px] text-slate-500 ml-auto">
                    Confidence: {(report.confidence * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <AssignmentSheet assignments={report?.assignments ?? []} />
            </div>

            {/* Workload Summary */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-200">Workload Distribution</h3>
              </div>
              <WorkloadSummary workload={report?.workload ?? []} />
            </div>

            {/* Shortfall Bucket */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-200">Shortfall Bucket</h3>
              </div>
              <ShortfallBucket
                shortfalls={report?.shortfalls ?? []}
                totalShortfall={report?.total_shortfall ?? 0}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 flex flex-col gap-1">
      <div className={`${accent} flex items-center gap-1.5`}>
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      <div className="text-xl font-bold text-slate-100 tabular-nums">{value}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </div>
  );
}
