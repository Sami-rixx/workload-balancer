# Workload Balancer Contract: Forensic Audit

## Executive summary

**OBSERVED FACT.** This repository implements a browser-only React/Vite workload-balancing application. Its executable contract is concentrated in `src/types/balancer.ts` and `src/engine/balancer.ts`; the principal operation is the exported asynchronous function `runBalancer`.

**OBSERVED FACT.** The implementation is a deterministic ordered greedy allocator, not a global optimizer. It has no runtime schema validator, API/server code, authentication, test suite, standalone fixtures, JSON Schema, or OpenAPI document.

**OBSERVED FACT.** The current executable teacher field is `teacher_name`. The README input example still uses `name`. Commit `ae12e94` changed the types, sample data, and engine from `name` to `teacher_name`, but did not update that README example.

**UNKNOWN.** Compatibility with a Mobius GateChecker or any intake payload cannot be certified from this repository alone. This repository contains no required external schema, payload, contract, or integration implementation against which to compare it.

## Scope and evidence

**OBSERVED FACT.** Evidence reviewed for this report was repository-local only: `README.md`; `src/types/balancer.ts`; `src/engine/balancer.ts`; `src/engine/sampleData.ts`; React UI components; build/configuration files; and relevant local Git history, including `c67d882` and `ae12e94`.

**OBSERVED FACT.** There are no test or specification files in the tracked tree beyond TypeScript interface declarations, the README, and the embedded `SAMPLE_DATA` object. There are no application HTTP handlers or client HTTP calls.

**INFERENCE.** Because executable code is the most direct local evidence of runtime behavior, this report treats it as authoritative where it conflicts with prose documentation.

## Actual input contract

**OBSERVED FACT.** TypeScript declares this root input shape:

```ts
{
  schema_version: string;
  school: { name: string; filled_by: string; filled_at: string };
  policy: {
    generalists_grade_scope: string;
    overload_policy: string;
    ambiguous_data_policy: string;
    specialist_scope_lock?: boolean;
  };
  subjects: Subject[];
  teachers: Teacher[];
  capabilities: Capability[];
  preferences: Preference[];
}
```

**OBSERVED FACT.** Every root field listed above is required by the TypeScript interface except `policy.specialist_scope_lock`. Each array is required by the declared type but can be empty. Runtime code performs no corresponding schema check.

| Entity | Declared required fields | Declared optional fields | Executable defaults/behavior |
|---|---|---|---|
| `school` | `name`, `filled_by`, `filled_at`: strings | none | Copied to output unchanged; no date/format validation. |
| `policy` | `generalists_grade_scope`, `overload_policy`, `ambiguous_data_policy`: strings | `specialist_scope_lock`: boolean | Only `overload_policy` and `specialist_scope_lock` affect allocation. |
| `subject` | `subject_code`, `subject_name`: strings; `grade_levels`: string[]; `periods_per_week`: number[] | `requires_lab`: boolean | Generates one slot per indexed grade; missing/null indexed period becomes `0`. |
| `teacher` | `teacher_id`, `teacher_name`: strings; `max_periods_week`: number | `specialist`: boolean; `confidence`: number; `flag_note`: string | `specialist` defaults false; confidence 1.0; flag null; maximum clamped to at least 0. |
| `capability` | `teacher_id`, `subject_code`: strings; `grades_can_teach`: string[] | `confidence`: number; `flag_note`: string | Confidence defaults 1.0 and flag defaults null. |
| `preference` | `teacher_id`, `subject_code`: strings; `grades`: string[]; `priority`: number | `confidence`: number; `flag_note`: string | Confidence defaults 1.0 and flag defaults null; no matching preference receives priority 2. |

**OBSERVED FACT.** No runtime rule enforces nullability, string pattern, date format, enum, cardinality, array alignment, uniqueness, numeric integrality, positivity, preference range, or confidence range. The README describes `priority_used` as 1–3, but the engine accepts any numeric priority.

**OBSERVED FACT.** Input grade strings and identifiers are matched exactly; no case, whitespace, or format normalization occurs.

## Domain entities, identifiers, and references

**OBSERVED FACT.** A subject-grade slot is formed for each `subject.grade_levels[i]`, with weekly demand `subject.periods_per_week[i] ?? 0`. A slot is indivisible: it is assigned to one teacher or left unassigned; its periods are not split.

**OBSERVED FACT.** Teacher capacity is `max_periods_week`. A capability is the sole eligibility source: an eligible record must have the same `subject_code` and contain the exact grade in `grades_can_teach`.

**OBSERVED FACT.** A preference is stored by `teacher_id:subject_code`; the engine never reads `Preference.grades`. Only the first preference record for that teacher/subject is used in normal assignment.

**OBSERVED FACT.** `requires_lab`, `generalists_grade_scope`, and `ambiguous_data_policy` are declared and appear in the sample, but are unused by the engine. Availability, daily timing, rooms, lab capacity, classes/sections, subject conflicts, and teacher schedule conflicts are not represented.

**OBSERVED FACT.** Reference integrity is not validated. Duplicate teacher IDs overwrite earlier capacity entries; total supply still includes all source rows. Unknown capability teachers are ignored during candidate construction. Capability/preference subjects need not be defined by a subject. Duplicate capabilities can affect scarcity and specialist counts. Duplicate preferences are retained but subsequent entries are ignored in normal selection.

## Validation and failure behavior

**OBSERVED FACT.** The UI validates JSON syntax only, using `JSON.parse`; it casts parsed data to the canonical type without runtime shape validation.

**OBSERVED FACT.** Invalid JSON is displayed as a parse error and balancing does not start. Valid JSON with missing or malformed operational fields may throw during execution; the UI catches the error and displays it as a balancing failure.

**OBSERVED FACT.** An ineligible or capacity-blocked slot does not throw: it becomes an `Unassigned` assignment and produces a shortfall record.

**OBSERVED FACT.** `BalancerReport.status` declares `FAILED`, but `runBalancer` never returns `FAILED`; it returns only `BALANCED` or `IMBALANCED`.

**OBSERVED FACT.** A UI `abortRef` exists but is never set true, so no actual cancellation operation exists.

## Transformations and normalization

**OBSERVED FACT.** Before allocation, the engine expands subjects into slots, builds capacity/eligibility/preference maps, clamps teacher capacity at zero, and defaults omitted specialist/confidence/flag fields.

**OBSERVED FACT.** It uses `0` when a generated subject-grade slot has no corresponding `periods_per_week` entry. Extra periods entries are ignored.

**OBSERVED FACT.** After allocation, it computes summaries, shortfalls, totals, and mean confidence. Workload entries are sorted by `teacher_id` with `localeCompare`.

**OBSERVED FACT.** It does not normalize identifiers, grades, names, dates, whitespace, case, duplicate records, priorities, confidence values, or references.

## Assignment and workload behavior

**OBSERVED FACT.** Slots are stable-sorted by ascending number of eligible capability entries (scarcity). It then optionally pre-assigns qualifying specialists, followed by normal greedy assignment.

**OBSERVED FACT.** With `specialist_scope_lock === true`, a slot is pre-assigned only when it has exactly one eligible specialist entry and that teacher has sufficient remaining capacity. This is a pre-assignment phase, not a lasting exclusive lock: failed pre-assignment falls through to normal selection.

**OBSERVED FACT.** Normal candidates are sorted by lower numeric preference priority, then greater remaining capacity. No preference defaults to priority 2. Under `overload_policy === "block"`, insufficient-capacity candidates are skipped. For every other value, the first ranked insufficient candidate is assigned and marked `Assigned-Overload`.

**INFERENCE.** The allocation result can depend on source-array order when scarcity, priority, and remaining capacity tie, because the engine provides no final explicit tie-breaker.

**OBSERVED FACT.** Workload is the sum of periods across assigned rows for each teacher: `used = Σ periods`, `remaining = max - used`; `FULL` means remaining is exactly zero, `UNDERLOAD` means positive remaining, and `OVERLOAD` means used exceeds max.

## Imbalance, shortfall, and confidence behavior

**OBSERVED FACT.** Every `Unassigned` assignment generates one unaggregated shortfall record containing subject, grade, and `periods_unmet`. `total_shortfall` is their summed periods.

**OBSERVED FACT.** `total_demand` is the sum of all generated slot periods. `total_supply` is the sum of nonnegative teacher maxima. `total_assigned` includes `Assigned` and `Assigned-Overload` periods. `overload_count` counts overload assignment rows, not excess periods.

**OBSERVED FACT.** Report status is `IMBALANCED` if either total shortfall is positive or at least one overload row exists; otherwise it is `BALANCED`.

**OBSERVED FACT.** Assignment confidence is the minimum of selected teacher, capability, and selected preference confidences. Report confidence is the unweighted arithmetic mean of assignment-row confidences. Flags are joined with `; `.

**OBSERVED FACT.** Unassigned rows have confidence `1.0` and an engine-generated explanation. Consequently, unassigned rows can increase the report’s mean confidence.

## Output contract

**OBSERVED FACT.** `runBalancer` resolves to this report shape:

```ts
{
  schema_version: string;        // copied from input
  school: SchoolInfo;            // input object passed through
  run_timestamp: string;         // new Date().toISOString()
  status: "BALANCED" | "IMBALANCED";
  step: "complete";
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

**OBSERVED FACT.** `AssignmentRow` contains `subject_code`, `subject_name`, `grade`, `periods`, nullable `teacher_id` and `teacher_name`, nullable `priority_used`, status (`Assigned`, `Assigned-Overload`, or `Unassigned`), `confidence`, and nullable `flag_note`.

**OBSERVED FACT.** Each workload entry contains teacher ID/name, used/max/remaining periods, workload status, and the associated assignment rows. Each shortfall contains subject code/name, grade, and unmet periods.

## API, authentication, and transport

**OBSERVED FACT.** No API exists in this repository. It has no server routes, HTTP request code, request/response transport format, authorization, authentication, credentials, persistence, or backend.

**OBSERVED FACT.** A user pastes JSON into a browser textarea; the resulting report exists in React component state and is rendered in the UI. The application is a client-side Vite SPA.

## Evidence quality, contradictions, and confidence concerns

**OBSERVED FACT.** The README asserts consumption of a “canonical payload” and references an external validator, but repository-local code performs no such validation. That claim cannot establish a local runtime contract.

**OBSERVED FACT.** The README’s `teachers[].name` example contradicts current types, sample data, and engine code, which require `teachers[].teacher_name`. Git commit `ae12e94` is direct local evidence that `teacher_name` is current.

**OBSERVED FACT.** No automated tests validate any of the stated contract behavior. The embedded sample is illustrative input, not an executable fixture/test.

**INFERENCE.** The TypeScript interfaces describe intended static shape but do not guarantee browser-runtime acceptance because JSON input bypasses TypeScript checks.

## Compatibility questions remaining UNKNOWN

- **UNKNOWN:** Whether a GateChecker/intake system emits `teacher_name` or the stale README spelling `name`.
- **UNKNOWN:** Whether external payloads constrain `schema_version`, dates, priorities, confidences, IDs, grade formats, cardinality, or reference integrity.
- **UNKNOWN:** The allowed semantics and values of `generalists_grade_scope`, `ambiguous_data_policy`, and non-`block` overload policies.
- **UNKNOWN:** Whether preference grades are meant to constrain preference application; this implementation ignores them.
- **UNKNOWN:** Whether specialist scope is intended to be an exclusive eligibility restriction rather than the implemented pre-assignment heuristic.
- **UNKNOWN:** Whether demand is intended to be splittable across teachers or represent multiple sections; this implementation treats each subject-grade slot as indivisible.
- **UNKNOWN:** Whether availability, timetable conflicts, room/lab constraints, or fairness/optimality requirements are mandatory downstream concerns.
- **UNKNOWN:** Whether downstream consumers require a `FAILED` report rather than a thrown/rejected operation on malformed input.

**UNKNOWN.** Until the corresponding integration contract is present in this repository, compatibility with the Mobius GateChecker or an intake payload cannot be certified from this repository alone.
