// ============================================================
// Shared Canonical Payload Types (from Gatechecker v2)
// ============================================================

export interface SchoolInfo {
  name: string;
  filled_by: string;
  filled_at: string;
}

export interface Policy {
  generalists_grade_scope: string;
  overload_policy: string;
  ambiguous_data_policy: string;
  specialist_scope_lock?: boolean;
}

export interface Subject {
  subject_code: string;
  subject_name: string;
  grade_levels: string[];
  periods_per_week: number[];
  requires_lab?: boolean;
}

export interface Teacher {
  teacher_id: string;
  teacher_name: string;
  max_periods_week: number;
  specialist?: boolean;
  confidence?: number;
  flag_note?: string;
}

export interface Capability {
  teacher_id: string;
  subject_code: string;
  grades_can_teach: string[];
  confidence?: number;
  flag_note?: string;
}

export interface Preference {
  teacher_id: string;
  subject_code: string;
  grades: string[];
  priority: number;
  confidence?: number;
  flag_note?: string;
}

export interface CanonicalPayload {
  schema_version: string;
  school: SchoolInfo;
  policy: Policy;
  subjects: Subject[];
  teachers: Teacher[];
  capabilities: Capability[];
  preferences: Preference[];
}

// ============================================================
// Workload Balancer Types
// ============================================================

export type AssignmentStatus = 'Assigned' | 'Assigned-Overload' | 'Unassigned';
export type WorkloadStatus = 'FULL' | 'UNDERLOAD' | 'OVERLOAD';

export interface AssignmentRow {
  subject_code: string;
  subject_name: string;
  grade: string;
  periods: number;
  teacher_id: string | null;
  teacher_name: string | null;
  priority_used: number | null;
  status: AssignmentStatus;
  confidence: number;
  flag_note: string | null;
}

export interface WorkloadEntry {
  teacher_id: string;
  teacher_name: string;
  used: number;
  max: number;
  remaining: number;
  status: WorkloadStatus;
  assignments: AssignmentRow[];
}

export interface ShortfallEntry {
  subject_code: string;
  subject_name: string;
  grade: string;
  periods_unmet: number;
}

export type BalancerStep =
  | 'idle'
  | 'building_maps'
  | 'ordering_slots'
  | 'specialist_preassign'
  | 'assigning'
  | 'propagating'
  | 'complete';

export interface BalancerReport {
  schema_version: string;
  school: SchoolInfo;
  run_timestamp: string;
  status: 'BALANCED' | 'IMBALANCED' | 'FAILED';
  step: BalancerStep;
  assignments: AssignmentRow[];
  workload: WorkloadEntry[];
  shortfalls: ShortfallEntry[];
  total_demand: number;
  total_supply: number;
  total_assigned: number;
  total_shortfall: number;
  overload_count: number;
  confidence: number;
}

export interface BalancerProgress {
  step: BalancerStep;
  message: string;
}
