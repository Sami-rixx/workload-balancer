# Workload Balancer Contract: Comprehensive Discovery Ledger

## Document Purpose

This document establishes the **actual executable contract** of the Workload Balancer repository through forensic analysis of source code, types, and data flow. It serves as the authoritative reference for understanding what payload the Workload Balancer accepts, processes, and produces.

**Audit Scope:** Repository-local evidence only (no external system assumptions)
**Last Updated:** 2026-08-28
**Related:** `02-workload-balancer-contract-audit.md` (preliminary forensic audit)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Evidence Sources and Methodology](#evidence-sources-and-methodology)
3. [Data Flow Architecture](#data-flow-architecture)
4. [Input Contract Specification](#input-contract-specification)
5. [Processing Pipeline](#processing-pipeline)
6. [Output Contract Specification](#output-contract-specification)
7. [Type Definitions Reference](#type-definitions-reference)
8. [Validation and Error Handling](#validation-and-error-handling)
9. [Compatibility Analysis: Workload Balancer vs Mobius Canonical Payload](#compatibility-analysis-workload-balancer-vs-mobius-canonical-payload)
10. [Unresolved Questions and Architectural Concerns](#unresolved-questions-and-architectural-concerns)
11. [Appendix: Source Code References](#appendix-source-code-references)

---

## Executive Summary

### OBSERVED FACT

The Workload Balancer is a **client-side only React/Vite SPA** with no backend, API routes, or authentication. The entire balancing logic is contained in `src/engine/balancer.ts`, with TypeScript type definitions in `src/types/balancer.ts`.

### OBSERVED FACT

The **actual entry point** for balancing operations is the exported async function `runBalancer` in `src/engine/balancer.ts:362`. This function:
- Accepts a single parameter: `data: CanonicalPayload`
- Returns a `Promise<BalancerReport>`
- Emits progress callbacks but does not validate input schema at runtime

### OBSERVED FACT

The Workload Balancer **accepts the CanonicalPayload interface directly** as defined in `src/types/balancer.ts:52-60`. There is **no transformation layer** between external input and the balancer engine. The JSON input from the UI textarea is parsed and cast directly to this type.

### OBSERVED FACT

**Critical Finding:** The README.md documentation contains a **field name mismatch**. The README example (line 47) shows `teachers[].name`, but the actual executable code, TypeScript types, and sample data all use `teachers[].teacher_name`. Commit `ae12e94` ("fix Teacher type and balancer engine: teacher_name field mismatch causing missing names in assignment output") corrected this from `name` to `teacher_name` in the code, but the README was not updated.

### OBSERVED FACT

The repository contains **no runtime schema validation**. Input validation is limited to JSON syntax parsing via `JSON.parse()` in `App.tsx:25`. There are no JSON Schema documents, Zod schemas, Yup schemas, or runtime type guards.

---

## Evidence Sources and Methodology

### Primary Sources (Authoritative)

| Source File | Lines | Evidence Type |
|---|---|---|
| `src/types/balancer.ts` | 1-128 | TypeScript type definitions (static contract) |
| `src/engine/balancer.ts` | 1-460 | Balancing engine implementation (executable contract) |
| `src/engine/sampleData.ts` | 1-97 | Representative input data |
| `src/App.tsx` | 22-53 | Entry point data flow (JSON parsing to balancer) |
| `src/sections/JsonEditor.tsx` | 27-41 | Input validation (JSON.parse only) |

### Secondary Sources (Documentation)

| Source File | Lines | Evidence Type |
|---|---|---|
| `README.md` | 1-97 | Project documentation (contains known inaccuracies) |
| `02-workload-balancer-contract-audit.md` | 1-169 | Preliminary forensic audit |

### Methodology

1. **Static Analysis:** TypeScript interfaces define the intended shape
2. **Executable Analysis:** Engine code reveals actual usage and defaults
3. **Data Flow Tracing:** From UI input → JSON.parse → runBalancer → BalancerReport
4. **Cross-Reference:** Compare types, sample data, engine usage, and documentation

---

## Data Flow Architecture

### OBSERVED FACT: Complete Data Flow

```
User Input (JSON textarea)
    ↓
JsonEditor.tsx: JSON.parse() validation (syntax only)
    ↓
App.tsx: handleRun() callback
    ↓
runBalancer(data: CanonicalPayload) - src/engine/balancer.ts:362
    ↓
buildWorkingMaps() - Transform to internal structures
    ↓
orderSlotsByScarcity() - Sort by eligible teacher count
    ↓
handleSpecialistPreAssignment() - Pre-assign specialists (if enabled)
    ↓
assignSlot() - Greedy assignment per slot
    ↓
buildWorkloadSummary() - Compute teacher workloads
    ↓
BalancerReport - Return to UI
    ↓
AssignmentSheet.tsx, WorkloadSummary.tsx, ShortfallBucket.tsx - Render output
```

### OBSERVED FACT: Entry Point

**File:** `src/engine/balancer.ts:362-365`
```typescript
export async function runBalancer(
  data: CanonicalPayload,
  onProgress?: (progress: BalancerProgress) => void
): Promise<BalancerReport>
```

This is the **single entry point** for all balancing operations. It accepts `CanonicalPayload` directly with no wrapper, transformation, or validation.

### OBSERVED FACT: UI Input Path

**File:** `src/App.tsx:22-26`
```typescript
const handleRun = useCallback(async () => {
  let data: CanonicalPayload;
  try {
    data = JSON.parse(jsonValue);
    setParseError(null);
  } catch (e) {
    setParseError(e instanceof Error ? e.message : 'Invalid JSON');
    return;
  }
```

The parsed JSON is **cast** to `CanonicalPayload` type with no runtime validation.

---

## Input Contract Specification

### Root Level: CanonicalPayload

**Source:** `src/types/balancer.ts:52-60`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `schema_version` | `string` | **Yes** | N/A | Schema version identifier. Copied to output unchanged. |
| `school` | `SchoolInfo` | **Yes** | N/A | School metadata. Passed through to output. |
| `policy` | `Policy` | **Yes** | N/A | Balancing configuration. Some fields affect behavior. |
| `subjects` | `Subject[]` | **Yes** | `[]` | Array of subject definitions. Can be empty. |
| `teachers` | `Teacher[]` | **Yes** | `[]` | Array of teacher definitions. Can be empty. |
| `capabilities` | `Capability[]` | **Yes** | `[]` | Array of teacher-subject eligibility. Can be empty. |
| `preferences` | `Preference[]` | **Yes** | `[]` | Array of teacher-subject preferences. Can be empty. |

**OBSERVED FACT:** All root fields are required by the TypeScript interface. Empty arrays are permitted for all array fields. No runtime validation enforces these requirements.

### SchoolInfo

**Source:** `src/types/balancer.ts:5-9`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `name` | `string` | **Yes** | N/A | School name. No format validation. |
| `filled_by` | `string` | **Yes** | N/A | Person who filled the payload. No format validation. |
| `filled_at` | `string` | **Yes** | N/A | Date when payload was filled. No format validation. |

**OBSERVED FACT:** School info is copied to output unchanged. No date format, pattern, or content validation is performed.

### Policy

**Source:** `src/types/balancer.ts:11-16`

| Field | Type | Required | Default | Executable Behavior |
|---|---|---|---|---|
| `generalists_grade_scope` | `string` | **Yes** | N/A | **UNUSED** - Declared but never read by engine |
| `overload_policy` | `string` | **Yes** | N/A | **ACTIVE** - Used in assignSlot() at line 262. Values: `"block"` (skip insufficient candidates) or any other value (allow overload) |
| `ambiguous_data_policy` | `string` | **Yes** | N/A | **UNUSED** - Declared but never read by engine |
| `specialist_scope_lock` | `boolean` | No | `false` | **ACTIVE** - Used in handleSpecialistPreAssignment() at line 144. When true, pre-assigns specialists with exactly one eligible slot and sufficient capacity |

**OBSERVED FACT:** Only `overload_policy` and `specialist_scope_lock` affect balancing behavior. The other two policy fields are declared but never used.

### Subject

**Source:** `src/types/balancer.ts:18-24`

| Field | Type | Required | Default | Executable Behavior |
|---|---|---|---|---|
| `subject_code` | `string` | **Yes** | N/A | Subject identifier. Used as key in eligibility and preference maps. |
| `subject_name` | `string` | **Yes** | N/A | Human-readable subject name. Passed through to assignments. |
| `grade_levels` | `string[]` | **Yes** | N/A | Array of grade identifiers. One slot created per grade. |
| `periods_per_week` | `number[]` | **Yes** | N/A | Periods per grade. Indexed by grade_levels position. |
| `requires_lab` | `boolean` | No | `false` | **UNUSED** - Declared but never read by engine |

**OBSERVED FACT:** Slot generation logic in `buildWorkingMaps()` at lines 52-62:
```typescript
for (const subject of data.subjects) {
  for (let i = 0; i < subject.grade_levels.length; i++) {
    slotDemands.push({
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      grade: subject.grade_levels[i],
      periods: subject.periods_per_week[i] ?? 0,  // Note: ?? 0 default
    });
  }
}
```

**OBSERVED FACT:** If `periods_per_week[i]` is null/undefined, it defaults to `0`. Extra `periods_per_week` entries beyond `grade_levels.length` are ignored.

### Teacher

**Source:** `src/types/balancer.ts:26-33`

| Field | Type | Required | Default | Executable Behavior |
|---|---|---|---|---|
| `teacher_id` | `string` | **Yes** | N/A | Teacher identifier. Used as key throughout. |
| `teacher_name` | `string` | **Yes** | N/A | **CRITICAL** - Actual field name in code. README shows `name` (INACCURATE). |
| `max_periods_week` | `number` | **Yes** | N/A | Maximum teaching capacity. Clamped to >= 0 in teacherCapacities map. |
| `specialist` | `boolean` | No | `false` | Used in specialist pre-assignment phase. Defaults to false. |
| `confidence` | `number` | No | `1.0` | Confidence score (0-1 range inferred). Defaults to 1.0. |
| `flag_note` | `string` | No | `null` | Flag/note text. Defaults to null. |

**OBSERVED FACT:** `buildWorkingMaps()` at lines 65-76:
```typescript
for (const teacher of data.teachers) {
  teacherCapacities.set(teacher.teacher_id, {
    teacher_id: teacher.teacher_id,
    teacher_name: teacher.teacher_name,
    max: Math.max(0, teacher.max_periods_week),  // Clamped to >= 0
    remaining: Math.max(0, teacher.max_periods_week),
    specialist: teacher.specialist ?? false,
    confidence: teacher.confidence ?? 1.0,
    flag_note: teacher.flag_note ?? null,
  });
}
```

### Capability

**Source:** `src/types/balancer.ts:35-41`

| Field | Type | Required | Default | Executable Behavior |
|---|---|---|---|---|
| `teacher_id` | `string` | **Yes** | N/A | Teacher identifier. Must exist in teachers for eligibility. |
| `subject_code` | `string` | **Yes** | N/A | Subject identifier. Need not exist in subjects. |
| `grades_can_teach` | `string[]` | **Yes** | N/A | Grades this teacher can teach for this subject. |
| `confidence` | `number` | No | `1.0` | Confidence score. Defaults to 1.0. |
| `flag_note` | `string` | No | `null` | Flag/note text. Defaults to null. |

**OBSERVED FACT:** Eligibility checking in `getEligibleTeachers()` at lines 126-132:
```typescript
function getEligibleTeachers(
  slot: SlotDemand,
  eligibilityMap: Map<string, EligibilityEntry[]>)
): EligibilityEntry[] {
  const entries = eligibilityMap.get(slot.subject_code) ?? [];
  return entries.filter((e) => e.grades.includes(slot.grade));
}
```

A teacher is eligible if:
1. They have a capability for the slot's `subject_code`
2. Their `grades_can_teach` array includes the slot's `grade`

**OBSERVED FACT:** Capability subjects need not be defined in the subjects array. Unknown capability teachers are silently ignored during candidate construction.

### Preference

**Source:** `src/types/balancer.ts:43-50`

| Field | Type | Required | Default | Executable Behavior |
|---|---|---|---|---|
| `teacher_id` | `string` | **Yes** | N/A | Teacher identifier. |
| `subject_code` | `string` | **Yes** | N/A | Subject identifier. |
| `grades` | `string[]` | **Yes** | N/A | **UNUSED** - Grades are declared but never read by engine. |
| `priority` | `number` | **Yes** | N/A | Priority tier. Lower numbers = higher priority. |
| `confidence` | `number` | No | `1.0` | Confidence score. Defaults to 1.0. |
| `flag_note` | `string` | No | `null` | Flag/note text. Defaults to null. |

**OBSERVED FACT:** Preference map building in `buildWorkingMaps()` at lines 93-106:
```typescript
for (const pref of data.preferences) {
  const key = `${pref.teacher_id}:${pref.subject_code}`;  // Note: grades not used
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
```

**CRITICAL FINDING:** The `grades` field in Preference is **never used** by the engine. Preferences are stored by `teacher_id:subject_code` key only, and the first preference for a given teacher/subject is used regardless of grade.

**OBSERVED FACT:** In `assignSlot()` at line 248, if no preference exists, priority defaults to `2`.

---

## Processing Pipeline

### Step 1: Build Working Maps

**Source:** `src/engine/balancer.ts:50-109`

Transforms `CanonicalPayload` into four internal data structures:

1. **slotDemands: SlotDemand[]** - One entry per subject-grade combination
   - Created from `data.subjects`
   - Each subject with N grades creates N slots
   - Periods default to 0 if missing/null

2. **teacherCapacities: Map<string, TeacherCapacity>** - Teacher capacity tracker
   - Key: `teacher_id`
   - Values include `max` (clamped >= 0), `remaining` (initialized = max), `specialist`, `confidence`, `flag_note`
   - Duplicate teacher IDs will overwrite earlier entries (Map behavior)

3. **eligibilityMap: Map<string, EligibilityEntry[]>** - Subject to eligible teachers
   - Key: `subject_code`
   - Values: Array of teachers with capabilities for that subject
   - Each entry includes `teacher_id`, `grades` (grades_can_teach), `confidence`, `flag_note`

4. **preferenceMap: Map<string, PreferenceEntry[]>** - Teacher-subject preferences
   - Key: `${teacher_id}:${subject_code}`
   - Values: Array of preferences (though only first is used)
   - Does NOT use grades field

### Step 2: Order Slots by Scarcity

**Source:** `src/engine/balancer.ts:115-132`

- Slots are sorted by ascending count of eligible teachers
- Slots with fewer eligible teachers are assigned first
- Uses stable sort (preserves order of equal-scarcity slots)

**INFERENCE:** This greedy approach prioritizes scarce resources, which is a reasonable heuristic for the constrained bipartite assignment problem described in README.

### Step 3: Specialist Pre-Assignment

**Source:** `src/engine/balancer.ts:138-205`

- Only executed if `data.policy.specialist_scope_lock ?? false` is true
- For each slot (in scarcity order):
  - Find eligible teachers who are specialists (`specialist: true`)
  - If exactly ONE eligible specialist exists with sufficient remaining capacity:
    - Pre-assign the slot to that teacher
    - Deduct periods from teacher's remaining capacity
  - Otherwise: slot falls through to normal assignment

**OBSERVED FACT:** This is a **pre-assignment phase**, not an exclusive lock. Failed pre-assignment slots are still considered in normal assignment.

### Step 4: Normal Slot Assignment

**Source:** `src/engine/balancer.ts:211-310`

For each slot (remaining after specialist pre-assignment):

1. **Get eligible teachers** via `getEligibleTeachers(slot, eligibilityMap)`
2. **If no eligible teachers:** Create `Unassigned` assignment with flag_note
3. **Build candidates** with teacher capacity info
4. **Augment with preferences:**
   - Look up by `${teacher_id}:${subject_code}` key
   - First preference used (ignores grades field)
   - Priority defaults to `2` if no preference exists
5. **Sort candidates:**
   - Primary: lower priority number (1 < 2 < 3)
   - Secondary: greater remaining capacity
6. **Check capacity:**
   - If `overload_policy === 'block'`: skip insufficient capacity candidates
   - Otherwise: allow assignment with `Assigned-Overload` status
7. **Select first candidate:** Assign slot to this teacher
8. **Compute confidence:** Minimum of teacher.confidence, capability.confidence, preference.confidence
9. **Join flag_notes:** From teacher, capability, preference (separated by `; `)

### Step 5: Build Workload Summary

**Source:** `src/engine/balancer.ts:316-356`

- Creates one `WorkloadEntry` per teacher
- Computes `used` (sum of assigned periods), `remaining` (max - used)
- Determines status:
  - `OVERLOAD`: used > max
  - `FULL`: remaining === 0
  - `UNDERLOAD`: remaining > 0
- Sorts entries by `teacher_id` using `localeCompare`

### Step 6: Build Shortfalls

**Source:** `src/engine/balancer.ts:412-419`

- Filters assignments where `status === 'Unassigned'`
- Creates `ShortfallEntry` for each:
  - `subject_code`, `subject_name`, `grade`, `periods_unmet` (from assignment.periods)

### Final Report Assembly

**Source:** `src/engine/balancer.ts:421-459`

Computes summary statistics:
- `totalDemand`: Sum of all slot periods
- `totalSupply`: Sum of all teacher `max_periods_week` (clamped >= 0)
- `totalAssigned`: Sum of periods for `Assigned` + `Assigned-Overload` assignments
- `totalShortfall`: Sum of all shortfall periods
- `overloadCount`: Count of `Assigned-Overload` assignments (not excess periods)
- `confidence`: Mean of all assignment confidences
- `status`:
  - `BALANCED`: if `totalShortfall === 0` AND `overloadCount === 0`
  - `IMBALANCED`: otherwise

**OBSERVED FACT:** The `BalancerReport` interface declares a `status` that can be `'BALANCED' | 'IMBALANCED' | 'FAILED'`, but the engine **never returns `'FAILED'`**. It only returns `'BALANCED'` or `'IMBALANCED'`.

---

## Output Contract Specification

### BalancerReport

**Source:** `src/types/balancer.ts:108-123`

| Field | Type | Source | Description |
|---|---|---|---|
| `schema_version` | `string` | Input | Copied from input `CanonicalPayload.schema_version` |
| `school` | `SchoolInfo` | Input | Copied from input `CanonicalPayload.school` |
| `run_timestamp` | `string` | Generated | ISO 8601 timestamp from `new Date().toISOString()` |
| `status` | `'BALANCED' \| 'IMBALANCED'` | Computed | `'BALANCED'` if no shortfalls and no overloads, else `'IMBALANCED'` |
| `step` | `BalancerStep` | Fixed | Always `'complete'` in final report |
| `assignments` | `AssignmentRow[]` | Generated | One row per subject-grade slot |
| `workload` | `WorkloadEntry[]` | Generated | One entry per teacher, sorted by teacher_id |
| `shortfalls` | `ShortfallEntry[]` | Generated | One entry per unassigned slot |
| `total_demand` | `number` | Computed | Sum of all slot periods |
| `total_supply` | `number` | Computed | Sum of all teacher max_periods_week (>= 0) |
| `total_assigned` | `number` | Computed | Sum of assigned + overloaded periods |
| `total_shortfall` | `number` | Computed | Sum of all shortfall periods |
| `overload_count` | `number` | Computed | Count of overload assignment rows |
| `confidence` | `number` | Computed | Mean of all assignment confidences (0-1) |

### AssignmentRow

**Source:** `src/types/balancer.ts:69-80`

| Field | Type | Description |
|---|---|---|
| `subject_code` | `string` | Subject identifier |
| `subject_name` | `string` | Human-readable subject name |
| `grade` | `string` | Grade level (e.g., "G7") |
| `periods` | `number` | Periods per week for this slot |
| `teacher_id` | `string \| null` | Assigned teacher ID, or null if unassigned |
| `teacher_name` | `string \| null` | Assigned teacher name, or null if unassigned |
| `priority_used` | `number \| null` | Priority tier used (1, 2, 3), or null if no preference |
| `status` | `AssignmentStatus` | `'Assigned'`, `'Assigned-Overload'`, or `'Unassigned'` |
| `confidence` | `number` | Propagated confidence (0-1) |
| `flag_note` | `string \| null` | Concatenated flag notes, or null |

### WorkloadEntry

**Source:** `src/types/balancer.ts:82-90`

| Field | Type | Description |
|---|---|---|
| `teacher_id` | `string` | Teacher identifier |
| `teacher_name` | `string` | Teacher name |
| `used` | `number` | Total periods assigned |
| `max` | `number` | Maximum capacity |
| `remaining` | `number` | `max - used` |
| `status` | `WorkloadStatus` | `'FULL'`, `'UNDERLOAD'`, or `'OVERLOAD'` |
| `assignments` | `AssignmentRow[]` | All assignments for this teacher |

### ShortfallEntry

**Source:** `src/types/balancer.ts:92-97`

| Field | Type | Description |
|---|---|---|
| `subject_code` | `string` | Subject identifier |
| `subject_name` | `string` | Human-readable subject name |
| `grade` | `string` | Grade level |
| `periods_unmet` | `number` | Number of periods that couldn't be assigned |

### Output Consumption

**OBSERVED FACT:** The output is consumed by three React components:

1. **AssignmentSheet.tsx** - Renders the `assignments` array as a table/cards
2. **WorkloadSummary.tsx** - Renders the `workload` array as teacher workload bars
3. **ShortfallBucket.tsx** - Renders the `shortfalls` array as unassigned slot list

All three components receive their data directly from `BalancerReport` fields with no transformation.

---

## Type Definitions Reference

### Complete TypeScript Interfaces

See `src/types/balancer.ts` for authoritative definitions.

```typescript
// Root input
export interface CanonicalPayload {
  schema_version: string;
  school: SchoolInfo;
  policy: Policy;
  subjects: Subject[];
  teachers: Teacher[];
  capabilities: Capability[];
  preferences: Preference[];
}

// School metadata
export interface SchoolInfo {
  name: string;
  filled_by: string;
  filled_at: string;
}

// Configuration
export interface Policy {
  generalists_grade_scope: string;
  overload_policy: string;
  ambiguous_data_policy: string;
  specialist_scope_lock?: boolean;
}

// Subject definition
export interface Subject {
  subject_code: string;
  subject_name: string;
  grade_levels: string[];
  periods_per_week: number[];
  requires_lab?: boolean;
}

// Teacher definition
export interface Teacher {
  teacher_id: string;
  teacher_name: string;  // NOT 'name' as in README
  max_periods_week: number;
  specialist?: boolean;
  confidence?: number;
  flag_note?: string;
}

// Teacher capability
export interface Capability {
  teacher_id: string;
  subject_code: string;
  grades_can_teach: string[];
  confidence?: number;
  flag_note?: string;
}

// Teacher preference
export interface Preference {
  teacher_id: string;
  subject_code: string;
  grades: string[];  // UNUSED by engine
  priority: number;
  confidence?: number;
  flag_note?: string;
}

// Output types
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

export interface BalancerReport {
  schema_version: string;
  school: SchoolInfo;
  run_timestamp: string;
  status: 'BALANCED' | 'IMBALANCED' | 'FAILED';  // FAILED never returned
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
```

---

## Validation and Error Handling

### Input Validation

| Validation Type | Status | Location | Notes |
|---|---|---|---|
| JSON syntax | ✅ Implemented | `App.tsx:25` | `JSON.parse()` catches syntax errors |
| Type validation | ❌ Not implemented | N/A | TypeScript types are compile-time only |
| Schema validation | ❌ Not implemented | N/A | No runtime schema checking |
| Required fields | ❌ Not implemented | N/A | TypeScript requires, but runtime doesn't check |
| Enum validation | ❌ Not implemented | N/A | Policy fields accept any string |
| Numeric ranges | ❌ Not implemented | N/A | No min/max validation on periods, confidence, etc. |
| Reference integrity | ❌ Not implemented | N/A | Duplicate IDs overwrite, missing references ignored |
| Array alignment | ❌ Not implemented | N/A | Subject periods/grades can be mismatched |

### Error Handling

| Scenario | Behavior | Location |
|---|---|---|
| Invalid JSON | Parse error displayed, balancing aborted | `App.tsx:28-29` |
| Valid JSON, wrong shape | May throw during execution | `runBalancer()` |
| No eligible teachers | Creates `Unassigned` assignment | `assignSlot():227-239` |
| Insufficient capacity (block policy) | Skips candidate | `assignSlot():262-264` |
| Insufficient capacity (non-block) | Creates `Assigned-Overload` | `assignSlot():266-267` |

### OBSERVED FACT

The UI catches all errors from `runBalancer()` and displays them as "Balancing failed" messages. See `App.tsx:47-49`:
```typescript
} catch (e) {
  console.error('Balancer error:', e);
  setParseError(e instanceof Error ? e.message : 'Balancing failed');
}
```

---

## Compatibility Analysis: Workload Balancer vs Mobius Canonical Payload

### Based on Repository-Local Evidence

This section compares the **Workload Balancer's actual accepted contract** (established from this repository) against the **known Mobius GateChecker v2 canonical payload** (referenced in README but not present in this repository).

**IMPORTANT:** Since the GateChecker v2 repository is not available for direct inspection per task constraints, this analysis is based on:
1. The README's claim that Workload Balancer "consumes the exact same canonical payload the Gatechecker validates"
2. The `teacher_name` vs `name` discrepancy discovered in this audit
3. Logical inference from the Workload Balancer's actual type definitions

### Known Compatibility Issues

#### CRITICAL: Teacher Field Name Mismatch

| Aspect | Workload Balancer | Mobius (Inferred) | Severity | Evidence |
|---|---|---|---|---|
| Teacher name field | `teacher_name: string` | Likely `name: string` | **BLOCKING** | README.md:47 shows `name`, but types/balancer.ts:27, sampleData.ts:68-75, balancer.ts:69 all use `teacher_name` |

**OBSERVED FACT (types/balancer.ts:27):**
```typescript
export interface Teacher {
  teacher_id: string;
  teacher_name: string;  // <-- ACTUAL FIELD NAME
  ...
}
```

**OBSERVED FACT (README.md:47):**
```json
{ "teacher_id": "T1", "name": "Mr. Otieno", ... }
```

**OBSERVED FACT (Git history):** Commit `ae12e94` changed from `name` to `teacher_name` in code, but README was not updated.

**IMPACT:** If Mobius GateChecker emits `name` instead of `teacher_name`, the Workload Balancer will receive `undefined` for teacher names, resulting in missing teacher names in all assignments and workload displays.

#### Unused Fields

| Field | Workload Balancer | Mobius (Inferred) | Impact |
|---|---|---|---|
| `requires_lab` | Declared, never used | Unknown | None - field is ignored |
| `generalists_grade_scope` | Declared, never used | Unknown | None - field is ignored |
| `ambiguous_data_policy` | Declared, never used | Unknown | None - field is ignored |
| `preferences[].grades` | Declared, never used | Unknown | **Data Loss** - grade-specific preferences are ignored |

**OBSERVED FACT:** The Workload Balancer **does not use** the `grades` field in Preference objects. All preferences are applied regardless of grade, which may differ from Mobius's intended semantics.

#### Semantic Mismatches

| Field | Workload Balancer | Mobius (Inferred) | Impact |
|---|---|---|---|
| `overload_policy` | Accepts any string, `'block'` blocks overloads | Unknown | Potential behavior mismatch |
| `specialist_scope_lock` | Pre-assignment heuristic | Unknown | Potential semantic mismatch |

### Fields That May Be Missing

**UNKNOWN:** Without access to Mobius GateChecker v2's actual schema, we cannot definitively identify:
- Fields produced by Mobius that Workload Balancer doesn't accept
- Fields required by Workload Balancer that Mobius doesn't produce

However, based on the README's claim of "exact same canonical payload", we can infer that the schemas **should** be identical, with the exception of the `teacher_name` vs `name` issue.

### Information Loss During Integration

If Mobius emits data that Workload Balancer accepts:
- **No information loss** for core fields (teacher_id, subject_code, grade_levels, periods_per_week, capabilities, preferences)
- **Potential information loss** for preference grades (if Mobius intends grade-specific preferences)

If Mobius emits data that Workload Balancer doesn't use:
- `requires_lab` - Ignored, no functional impact
- `generalists_grade_scope` - Ignored, no functional impact
- `ambiguous_data_policy` - Ignored, no functional impact

### Compatibility Matrix

| Mobius Field | WB Accepts? | WB Uses? | Notes |
|---|---|---|---|
| `schema_version` | ✅ Yes | ✅ Yes | Copied to output |
| `school` | ✅ Yes | ✅ Yes | Passed through |
| `policy` | ✅ Yes | ⚠️ Partial | Only `overload_policy` and `specialist_scope_lock` used |
| `subjects` | ✅ Yes | ✅ Yes | Core input |
| `teachers` | ✅ Yes | ✅ Yes | Core input |
| `capabilities` | ✅ Yes | ✅ Yes | Core input |
| `preferences` | ✅ Yes | ⚠️ Partial | `grades` field unused |

---

## Unresolved Questions and Architectural Concerns

### Contract-Related UNKNOWNs

1. **UNKNOWN:** Does Mobius GateChecker v2 emit `teacher_name` or `name` for teacher objects?
   - **Evidence:** Workload Balancer code uses `teacher_name`, README example uses `name`
   - **Impact:** BLOCKING - Direct integration will fail or lose data if field names don't match

2. **UNKNOWN:** What is the complete Mobius GateChecker v2 canonical payload schema?
   - **Evidence:** Not present in this repository
   - **Impact:** Cannot verify full compatibility without external schema

3. **UNKNOWN:** What are the valid values and semantics for `generalists_grade_scope`?
   - **Evidence:** Declared but never used by Workload Balancer
   - **Impact:** Field is ignored, but may be important for Mobius

4. **UNKNOWN:** What are the valid values and semantics for `ambiguous_data_policy`?
   - **Evidence:** Declared but never used by Workload Balancer
   - **Impact:** Field is ignored, but may be important for Mobius

5. **UNKNOWN:** What non-`block` values does `overload_policy` support, and what do they mean?
   - **Evidence:** Only checked for equality with `'block'` at balancer.ts:262
   - **Impact:** Any other value allows overloads, but semantics undefined

6. **UNKNOWN:** Are preference `grades` intended to constrain preference application?
   - **Evidence:** Workload Balancer ignores this field completely
   - **Impact:** Grade-specific preferences would be lost in current implementation

7. **UNKNOWN:** Is `specialist_scope_lock` intended as pre-assignment or exclusive restriction?
   - **Evidence:** Current implementation is pre-assignment only, not exclusive
   - **Impact:** Semantic mismatch possible with Mobius intent

8. **UNKNOWN:** Should slot demand be splittable across teachers?
   - **Evidence:** Current implementation treats each subject-grade slot as indivisible
   - **Impact:** May not match Mobius's intended assignment model

### Validation-Related UNKNOWNs

9. **UNKNOWN:** Should input be validated before processing?
   - **Evidence:** Current implementation has no runtime validation
   - **Impact:** Malformed input may cause runtime errors

10. **UNKNOWN:** What are acceptable numeric ranges for `confidence` (0-1?), `periods`, `max_periods_week`?
    - **Evidence:** No validation in code
    - **Impact:** Invalid values may produce incorrect results

11. **UNKNOWN:** Should identifier uniqueness be enforced (teacher_id, subject_code)?
    - **Evidence:** Duplicate IDs overwrite in maps
    - **Impact:** Data loss possible with duplicate IDs

### Output-Related UNKNOWNs

12. **UNKNOWN:** When should `BalancerReport.status` be `'FAILED'`?
    - **Evidence:** Never returned by current implementation
    - **Impact:** Downstream consumers expecting `FAILED` will never receive it

13. **UNKNOWN:** Should assignment confidence be constrained to [0, 1] range?
    - **Evidence:** Computed as minimum of various confidences
    - **Impact:** Values outside range possible if input confidences are invalid

---

## Appendix: Source Code References

### Type Definitions

| Interface | File | Lines | Purpose |
|---|---|---|---|
| `CanonicalPayload` | `src/types/balancer.ts` | 52-60 | Root input type |
| `SchoolInfo` | `src/types/balancer.ts` | 5-9 | School metadata |
| `Policy` | `src/types/balancer.ts` | 11-16 | Configuration |
| `Subject` | `src/types/balancer.ts` | 18-24 | Subject definition |
| `Teacher` | `src/types/balancer.ts` | 26-33 | Teacher definition |
| `Capability` | `src/types/balancer.ts` | 35-41 | Teacher eligibility |
| `Preference` | `src/types/balancer.ts` | 43-50 | Teacher preference |
| `AssignmentRow` | `src/types/balancer.ts` | 69-80 | Output assignment |
| `WorkloadEntry` | `src/types/balancer.ts` | 82-90 | Output teacher workload |
| `ShortfallEntry` | `src/types/balancer.ts` | 92-97 | Output unassigned slots |
| `BalancerReport` | `src/types/balancer.ts` | 108-123 | Complete output |

### Engine Implementation

| Function | File | Lines | Purpose |
|---|---|---|---|
| `runBalancer` | `src/engine/balancer.ts` | 362-460 | Main entry point |
| `buildWorkingMaps` | `src/engine/balancer.ts` | 50-109 | Input transformation |
| `orderSlotsByScarcity` | `src/engine/balancer.ts` | 115-124 | Slot ordering |
| `handleSpecialistPreAssignment` | `src/engine/balancer.ts` | 138-205 | Specialist handling |
| `assignSlot` | `src/engine/balancer.ts` | 211-310 | Core assignment logic |
| `buildWorkloadSummary` | `src/engine/balancer.ts` | 316-356 | Workload computation |

### Data Flow

| Component | File | Lines | Role |
|---|---|---|---|
| JsonEditor | `src/sections/JsonEditor.tsx` | 27-41 | Input parsing (JSON.parse) |
| App | `src/App.tsx` | 22-53 | Data flow orchestration |
| BalancerPipeline | `src/sections/BalancerPipeline.tsx` | 17-109 | Progress visualization |
| AssignmentSheet | `src/sections/AssignmentSheet.tsx` | 99-232 | Output rendering |
| WorkloadSummary | `src/sections/WorkloadSummary.tsx` | 42-138 | Output rendering |
| ShortfallBucket | `src/sections/ShortfallBucket.tsx` | 10-86 | Output rendering |

### Sample Data

| Dataset | File | Lines | Purpose |
|---|---|---|---|
| SAMPLE_DATA | `src/engine/sampleData.ts` | 3-97 | Representative input |

---

## Baseline Verification

**TypeScript Type-Check:** ✅ PASSED
```bash
npx tsc --noEmit
# Exit code: 0, no errors
```

**Production Build:** ⏳ NOT RUN (timeout in current environment, but TypeScript compilation succeeded)

**Lint:** ❌ PRE-EXISTING FAILURE (no ESLint config file exists)
```bash
npm run lint
# Error: ESLint couldn't find an eslint.config.(js|mjs|cjs) file
```

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0 | 2026-08-28 | Contract Discovery Audit | Initial comprehensive ledger |

---

*This document establishes the executable contract of the Workload Balancer based solely on repository-local evidence. For integration with Mobius GateChecker v2, the field name mismatch (`teacher_name` vs `name`) must be resolved as a minimum requirement.*
