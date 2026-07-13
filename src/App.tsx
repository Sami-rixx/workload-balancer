import { useState, useCallback, useRef } from 'react';
import { BarChart3, CheckCircle2, AlertTriangle, Users, Table2 } from 'lucide-react';
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
    <div
      className="min-h-screen flex flex-col relative"
      style={{ background: 'var(--bg-canvas)' }}
    >
      {/* Blueprint grid overlay */}
      <div
        className="fixed inset-0 blueprint-grid pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* === HEADER === */}
      <header
        className="relative flex-shrink-0 flex items-center justify-between px-4 sm:px-6 h-14"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          zIndex: 10,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Möbius strip logo */}
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none" className="flex-shrink-0">
            <path
              d="M16 4C16 4 8 8 8 16C8 24 16 28 16 28C16 28 24 24 24 16C24 8 16 4 16 4Z"
              stroke="var(--brass)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="rgba(201,169,110,0.08)"
            />
            <path
              d="M16 28C16 28 12 20 12 16C12 12 16 4 16 4"
              stroke="var(--brass)"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
              opacity="0.5"
            />
            <circle cx="16" cy="16" r="3" fill="var(--brass)" opacity="0.35" />
          </svg>
          <div className="flex items-baseline gap-2 min-w-0">
            <span
              className="font-display text-sm sm:text-base font-semibold tracking-wide truncate"
              style={{ color: 'var(--text-primary)', letterSpacing: '0.02em' }}
            >
              Blueprint Workload Balancer
            </span>
            <span
              className="hidden sm:inline font-mono text-xs flex-shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              v1.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {report && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm"
              style={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)' }}
            >
              {report.status === 'BALANCED' ? (
                <>
                  <CheckCircle2 size={14} style={{ color: 'var(--accent-pass)' }} />
                  <span className="text-xs font-medium hidden sm:inline" style={{ color: 'var(--accent-pass)' }}>
                    Balanced
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle size={14} style={{ color: 'var(--accent-warn)' }} />
                  <span className="text-xs font-medium hidden sm:inline" style={{ color: 'var(--accent-warn)' }}>
                    Imbalanced
                  </span>
                </>
              )}
            </div>
          )}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
            style={{ background: 'var(--bg-surface-raised)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--brass)' }} />
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              {report ? `${(report.confidence * 100).toFixed(0)}%` : 'Ready'}
            </span>
          </div>
        </div>
      </header>

      {/* === PIPELINE INDICATOR === */}
      <div
        className="relative flex-shrink-0 px-4 sm:px-6 py-3"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          zIndex: 5,
        }}
      >
        <BalancerPipeline step={step} />
      </div>

      {/* === MAIN CONTENT === */}
      <main
        className="relative flex-1 flex flex-col lg:flex-row gap-3 sm:gap-4 p-3 sm:p-4 overflow-auto"
        style={{ zIndex: 1 }}
      >
        {/* Left: JSON Input */}
        <div className="w-full lg:flex-1 lg:min-w-0 lg:max-w-[45%]">
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
        <div className="w-full lg:flex-1 lg:min-w-0 flex flex-col gap-3 sm:gap-4">
          {/* Stats Row */}
          {report && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <StatCard
                icon={<BarChart3 size={16} />}
                label="Demand"
                value={`${report.total_demand}`}
                sub={`Supply: ${report.total_supply}`}
                accent="var(--accent-slate)"
              />
              <StatCard
                icon={<CheckCircle2 size={16} />}
                label="Assigned"
                value={`${report.total_assigned}`}
                sub={`of ${report.total_demand} periods`}
                accent="var(--accent-pass)"
              />
              <StatCard
                icon={<AlertTriangle size={16} />}
                label="Shortfall"
                value={`${report.total_shortfall}`}
                sub={report.total_shortfall > 0 ? 'needs attention' : 'none'}
                accent={report.total_shortfall > 0 ? 'var(--accent-fail)' : 'var(--accent-pass)'}
              />
              <StatCard
                icon={<Users size={16} />}
                label="Overloads"
                value={`${report.overload_count}`}
                sub={report.overload_count > 0 ? 'capacity exceeded' : 'all clear'}
                accent={report.overload_count > 0 ? 'var(--accent-warn)' : 'var(--accent-pass)'}
              />
            </div>
          )}

          {/* Results panels */}
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Assignment Sheet */}
            <div className="panel">
              <div
                className="flex items-center gap-2 px-3 sm:px-4 py-3"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <Table2 size={14} style={{ color: 'var(--brass)' }} />
                <span className="label-caps">Assignment Sheet</span>
                {report && (
                  <span className="font-mono text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                    {report.assignments.length} rows
                  </span>
                )}
              </div>
              <div className="p-3 sm:p-4">
                <AssignmentSheet assignments={report?.assignments ?? []} />
              </div>
            </div>

            {/* Workload Summary */}
            <div className="panel">
              <div
                className="flex items-center gap-2 px-3 sm:px-4 py-3"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <Users size={14} style={{ color: 'var(--brass)' }} />
                <span className="label-caps">Workload Distribution</span>
              </div>
              <div className="p-3 sm:p-4">
                <WorkloadSummary workload={report?.workload ?? []} />
              </div>
            </div>

            {/* Shortfall Bucket */}
            <div className="panel">
              <div
                className="flex items-center gap-2 px-3 sm:px-4 py-3"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <AlertTriangle size={14} style={{ color: 'var(--accent-fail)' }} />
                <span className="label-caps">Shortfall Bucket</span>
              </div>
              <div className="p-3 sm:p-4">
                <ShortfallBucket
                  shortfalls={report?.shortfalls ?? []}
                  totalShortfall={report?.total_shortfall ?? 0}
                />
              </div>
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
    <div
      className="panel p-3 flex flex-col gap-1.5"
    >
      <div className="flex items-center gap-1.5">
        <span style={{ color: accent }}>{icon}</span>
        <span className="label-caps" style={{ fontSize: 10 }}>{label}</span>
      </div>
      <div className="font-display text-xl sm:text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      <div className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
        {sub}
      </div>
    </div>
  );
}
