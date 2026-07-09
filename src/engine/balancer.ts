import type {
  CanonicalPayload,
  AssignmentRow,
  WorkloadEntry,
  ShortfallEntry,
  BalancerReport,
  BalancerProgress,
  AssignmentStatus,
} from '@/types/balancer';

// ============================================================
// INTERNAL WORKING STRUCTURES
// ============================================================

interface SlotDemand {
  subject_code: string;
  subject_name: string;
  grade: string;
  periods: number;
}

interface TeacherCapacity {
  teacher_id: string;
  teacher_name: string;
  max: number;
  remaining: number;
  specialist: boolean;
  confidence: number;
  flag_note: string | null;
}

interface EligibilityEntry {
  teacher_id: string;
  grades: string[];
  confidence: number;
  flag_note: string | null;
}

interface PreferenceEntry {
  teacher_id: string;
  priority: number;
  confidence: number;
  flag_note: string | null;
}

// ============================================================
// STEP 1 — Build working maps
// ============================================================

function buildWorkingMaps(data: CanonicalPayload) {
  // (a) Slot demand: every subject-grade combo with periods
  const slotDemands: SlotDemand[] = [];
  for (const subject of data.subjects) {
    for (let i = 0; i < subject.grade_levels.length; i++) {
      slotDemands.push({
        subject_code: subject.subject_code,
        subject_name: subject.subject_name,
        grade: subject.grade_levels[i],
        periods: subject.periods_per_week[i] ?? 0,
      });
    }
  }

  // (b) Teacher remaining capacity
  const teacherCapacities = new Map<string, TeacherCapacity>();
  for (const teacher of data.teachers) {
    teacherCapacities.set(teacher.teacher_id, {
      teacher_id: teacher.teacher_id,
      teacher_name: teacher.name,
      max: Math.max(0, teacher.max_periods_week),
      remaining: Math.max(0, teacher.max_periods_week),
      specialist: teacher.specialist ?? false,
      confidence: teacher.confidence ?? 1.0,
      flag_note: teacher.flag_note ?? null,
    });
  }

  // (c) Eligibility map: which teachers can teach which (subject, grade)
  const eligibilityMap = new Map<string, EligibilityEntry[]>();
  for (const cap of data.capabilities) {
    const key = cap.subject_code;
    if (!eligibilityMap.has(key)) {
      eligibilityMap.set(key, []);
    }
    eligibilityMap.get(key)!.push({
      teacher_id: cap.teacher_id,
      grades: cap.grades_can_teach,
      confidence: cap.confidence ?? 1.0,
      flag_note: cap.flag_note ?? null,
    });
  }

  // (d) Preference map: priority tier per teacher-subject-grade
  const preferenceMap = new Map<string, PreferenceEntry[]>();
  for (const pref of data.preferences) {
    const key = `${pref.teacher_id}:${pref.subject_code}`;
    if (!preferenceMap.has(key)) {
      preferenceMap.set(key, []);
    }
    preferenceMap.get(key)!.push({
      teacher_id: pref.teacher_id,
      priority: pref.priority,
      confidence: pref.confidence ?? 1.0,
      flag_note: pref.flag_note ?? null,
    });
  }

  return { slotDemands, teacherCapacities, eligibilityMap, preferenceMap };
}

// ============================================================
// STEP 2 — Order slots by scarcity
// ============================================================

function orderSlotsByScarcity(
  slotDemands: SlotDemand[],
  eligibilityMap: Map<string, EligibilityEntry[]>
): SlotDemand[] {
  return [...slotDemands].sort((a, b) => {
    const eligibleA = getEligibleTeachers(a, eligibilityMap).length;
    const eligibleB = getEligibleTeachers(b, eligibilityMap).length;
    return eligibleA - eligibleB;
  });
}

function getEligibleTeachers(
  slot: SlotDemand,
  eligibilityMap: Map<string, EligibilityEntry[]>
): EligibilityEntry[] {
  const entries = eligibilityMap.get(slot.subject_code) ?? [];
  return entries.filter((e) => e.grades.includes(slot.grade));
}

// ============================================================
// STEP 3 — Specialist pre-assignment
// ============================================================

function handleSpecialistPreAssignment(
  sortedSlots: SlotDemand[],
  teacherCapacities: Map<string, TeacherCapacity>,
  eligibilityMap: Map<string, EligibilityEntry[]>,
  preferenceMap: Map<string, PreferenceEntry[]>,
  specialistScopeLock: boolean
): { assignments: AssignmentRow[]; remainingSlots: SlotDemand[] } {
  const assignments: AssignmentRow[] = [];

  if (!specialistScopeLock) {
    return { assignments, remainingSlots: sortedSlots };
  }

  const remainingSlots: SlotDemand[] = [];

  for (const slot of sortedSlots) {
    const eligible = getEligibleTeachers(slot, eligibilityMap);
    const specialists = eligible.filter((e) => {
      const tc = teacherCapacities.get(e.teacher_id);
      return tc?.specialist ?? false;
    });

    if (specialists.length === 1) {
      const spec = specialists[0];
      const tc = teacherCapacities.get(spec.teacher_id);
      if (tc && tc.remaining >= slot.periods) {
        const prefKey = `${spec.teacher_id}:${slot.subject_code}`;
        const prefs = preferenceMap.get(prefKey) ?? [];
        const pref = prefs.find((_p) =>
          eligibilityMap
            .get(slot.subject_code)
            ?.find((e) => e.teacher_id === spec.teacher_id)
            ?.grades.includes(slot.grade)
        );

        const confidence = Math.min(
          tc.confidence,
          spec.confidence,
          pref?.confidence ?? 1.0
        );

        const flagNotes = [tc.flag_note, spec.flag_note, pref?.flag_note ?? null].filter(
          Boolean
        ) as string[];

        assignments.push({
          subject_code: slot.subject_code,
          subject_name: slot.subject_name,
          grade: slot.grade,
          periods: slot.periods,
          teacher_id: spec.teacher_id,
          teacher_name: tc.teacher_name,
          priority_used: pref?.priority ?? 1,
          status: 'Assigned',
          confidence,
          flag_note: flagNotes.length > 0 ? flagNotes.join('; ') : null,
        });

        tc.remaining -= slot.periods;
        continue;
      }
    }

    remainingSlots.push(slot);
  }

  return { assignments, remainingSlots };
}

// ============================================================
// STEP 4 & 5 — Within-slot selection + capacity handling
// ============================================================

function assignSlot(
  slot: SlotDemand,
  teacherCapacities: Map<string, TeacherCapacity>,
  eligibilityMap: Map<string, EligibilityEntry[]>,
  preferenceMap: Map<string, PreferenceEntry[]>,
  overloadPolicy: string
): AssignmentRow {
  const eligible = getEligibleTeachers(slot, eligibilityMap);

  const candidates = eligible
    .map((e) => ({
      ...e,
      tc: teacherCapacities.get(e.teacher_id)!,
    }))
    .filter((c) => c.tc !== undefined);

  if (candidates.length === 0) {
    return {
      subject_code: slot.subject_code,
      subject_name: slot.subject_name,
      grade: slot.grade,
      periods: slot.periods,
      teacher_id: null,
      teacher_name: null,
      priority_used: null,
      status: 'Unassigned',
      confidence: 1.0,
      flag_note: `No eligible teacher for ${slot.subject_code} at ${slot.grade}`,
    };
  }

  const candidatesWithPriority = candidates.map((c) => {
    const prefKey = `${c.teacher_id}:${slot.subject_code}`;
    const prefs = preferenceMap.get(prefKey) ?? [];
    const pref = prefs[0];
    return {
      ...c,
      priority: pref?.priority ?? 2,
      prefConfidence: pref?.confidence ?? 1.0,
      prefFlagNote: pref?.flag_note ?? null,
    };
  });

  candidatesWithPriority.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.tc.remaining - a.tc.remaining;
  });

  for (const candidate of candidatesWithPriority) {
    const wouldExceed = candidate.tc.remaining < slot.periods;

    if (wouldExceed && overloadPolicy === 'block') {
      continue;
    }

    const isOverload = wouldExceed && overloadPolicy !== 'block';
    const status: AssignmentStatus = isOverload ? 'Assigned-Overload' : 'Assigned';

    const confidence = Math.min(
      candidate.tc.confidence,
      candidate.confidence,
      candidate.prefConfidence
    );

    const flagNotes = [
      candidate.tc.flag_note,
      candidate.flag_note,
      candidate.prefFlagNote,
    ].filter(Boolean) as string[];

    const assignment: AssignmentRow = {
      subject_code: slot.subject_code,
      subject_name: slot.subject_name,
      grade: slot.grade,
      periods: slot.periods,
      teacher_id: candidate.teacher_id,
      teacher_name: candidate.tc.teacher_name,
      priority_used: candidate.priority,
      status,
      confidence,
      flag_note: flagNotes.length > 0 ? flagNotes.join('; ') : null,
    };

    candidate.tc.remaining -= slot.periods;
    return assignment;
  }

  return {
    subject_code: slot.subject_code,
    subject_name: slot.subject_name,
    grade: slot.grade,
    periods: slot.periods,
    teacher_id: null,
    teacher_name: null,
    priority_used: null,
    status: 'Unassigned',
    confidence: 1.0,
    flag_note: `No teacher with sufficient remaining capacity for ${slot.subject_code} at ${slot.grade} (${slot.periods} periods)`,
  };
}

// ============================================================
// STEP 6 — Build workload summary
// ============================================================

function buildWorkloadSummary(
  assignments: AssignmentRow[],
  teacherCapacities: Map<string, TeacherCapacity>
): WorkloadEntry[] {
  const workloadMap = new Map<string, WorkloadEntry>();

  for (const [teacher_id, tc] of teacherCapacities) {
    workloadMap.set(teacher_id, {
      teacher_id,
      teacher_name: tc.teacher_name,
      used: 0,
      max: tc.max,
      remaining: tc.max,
      status: 'UNDERLOAD',
      assignments: [],
    });
  }

  for (const assignment of assignments) {
    if (assignment.teacher_id && workloadMap.has(assignment.teacher_id)) {
      const entry = workloadMap.get(assignment.teacher_id)!;
      entry.used += assignment.periods;
      entry.remaining = entry.max - entry.used;
      entry.assignments.push(assignment);
    }
  }

  for (const entry of workloadMap.values()) {
    if (entry.used > entry.max) {
      entry.status = 'OVERLOAD';
    } else if (entry.remaining === 0) {
      entry.status = 'FULL';
    } else {
      entry.status = 'UNDERLOAD';
    }
  }

  return Array.from(workloadMap.values()).sort((a, b) =>
    a.teacher_id.localeCompare(b.teacher_id)
  );
}

// ============================================================
// MAIN BALANCING ORCHESTRATOR
// ============================================================

export async function runBalancer(
  data: CanonicalPayload,
  onProgress?: (progress: BalancerProgress) => void
): Promise<BalancerReport> {
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  onProgress?.({ step: 'building_maps', message: 'Building working maps...' });
  await delay(400);
  const { slotDemands, teacherCapacities, eligibilityMap, preferenceMap } =
    buildWorkingMaps(data);

  onProgress?.({ step: 'ordering_slots', message: 'Ordering slots by scarcity...' });
  await delay(400);
  const sortedSlots = orderSlotsByScarcity(slotDemands, eligibilityMap);

  onProgress?.({
    step: 'specialist_preassign',
    message: 'Pre-assigning specialists...',
  });
  await delay(400);
  const { assignments: specialistAssignments, remainingSlots } =
    handleSpecialistPreAssignment(
      sortedSlots,
      teacherCapacities,
      eligibilityMap,
      preferenceMap,
      data.policy.specialist_scope_lock ?? false
    );

  onProgress?.({ step: 'assigning', message: 'Assigning slots...' });
  await delay(400);

  const assignments: AssignmentRow[] = [...specialistAssignments];

  for (const slot of remainingSlots) {
    const assignment = assignSlot(
      slot,
      teacherCapacities,
      eligibilityMap,
      preferenceMap,
      data.policy.overload_policy
    );
    assignments.push(assignment);
  }

  onProgress?.({ step: 'propagating', message: 'Propagating confidence...' });
  await delay(400);

  const workload = buildWorkloadSummary(assignments, teacherCapacities);

  const shortfalls: ShortfallEntry[] = assignments
    .filter((a) => a.status === 'Unassigned')
    .map((a) => ({
      subject_code: a.subject_code,
      subject_name: a.subject_name,
      grade: a.grade,
      periods_unmet: a.periods,
    }));

  const totalDemand = slotDemands.reduce((s, d) => s + d.periods, 0);
  const totalSupply = data.teachers.reduce(
    (s, t) => s + Math.max(0, t.max_periods_week),
    0
  );
  const totalAssigned = assignments
    .filter((a) => a.status === 'Assigned' || a.status === 'Assigned-Overload')
    .reduce((s, a) => s + a.periods, 0);
  const totalShortfall = shortfalls.reduce((s, sh) => s + sh.periods_unmet, 0);
  const overloadCount = assignments.filter((a) => a.status === 'Assigned-Overload').length;

  const confidence =
    assignments.length > 0
      ? assignments.reduce((s, a) => s + a.confidence, 0) / assignments.length
      : 1.0;

  let status: BalancerReport['status'] = 'BALANCED';
  if (totalShortfall > 0 || overloadCount > 0) {
    status = 'IMBALANCED';
  }

  onProgress?.({ step: 'complete', message: 'Balancing complete' });

  return {
    schema_version: data.schema_version,
    school: data.school,
    run_timestamp: new Date().toISOString(),
    status,
    step: 'complete',
    assignments,
    workload,
    shortfalls,
    total_demand: totalDemand,
    total_supply: totalSupply,
    total_assigned: totalAssigned,
    total_shortfall: totalShortfall,
    overload_count: overloadCount,
    confidence,
  };
}
