# Blueprint Workload Balancer

A deterministic workload balancing engine for school timetable planning. The Balancer is **Tool 1 of 2** in the Möbius Muse Blueprint Timetable System — it consumes a canonical payload (validated by the [Blueprint Gatechecker](https://github.com/Sami-rixx/gatechecker-v2)) and produces a complete assignment sheet mapping teachers to subject-grade slots.

## What It Does

The Balancer takes a **canonical payload** (JSON) describing your school's teachers, subjects, capabilities, and preferences — then runs a deterministic greedy algorithm that:

1. **Builds working maps** — demand, capacity, eligibility, and preference structures
2. **Orders slots by scarcity** — scarce slots (few eligible teachers) are assigned first
3. **Pre-assigns specialists** — locked to their subject before generalist assignment
4. **Selects teachers per slot** — by priority tier, then by remaining capacity
5. **Handles capacity boundaries** — respects `overload_policy` (block or allow)
6. **Propagates confidence** — every assignment inherits the lowest upstream confidence

## Algorithm

The core problem is a **constrained bipartite assignment**: subject-grade slots × teachers. At Dexter Junior Academy's scale, an ordered greedy algorithm is the right tool — it stays auditable for school administrators reviewing results.

| Step | Action |
|---|---|
| 1 | Build slot demand, teacher capacity, eligibility, and preference maps |
| 2 | Sort slots by scarcity (ascending eligible teacher count) |
| 3 | Pre-assign specialists (if `specialist_scope_lock` enabled) |
| 4 | For each slot: pick by priority tier (1→2→3), tiebreak by remaining capacity |
| 5 | Apply `overload_policy`: block or flag overloads explicitly |
| 6 | Propagate minimum confidence from contributing rows |

## Input Contract

Consumes the **exact same canonical payload** the Gatechecker validates — no reshaping required:

```json
{
  "schema_version": "1.0.0",
  "school": { "name": "...", "filled_by": "...", "filled_at": "..." },
  "policy": {
    "generalists_grade_scope": "explicit_only",
    "overload_policy": "block",
    "ambiguous_data_policy": "use_default_and_warn",
    "specialist_scope_lock": true
  },
  "subjects": [
    { "subject_code": "MATH", "subject_name": "Mathematics", "grade_levels": ["G7","G8","G9"], "periods_per_week": [5,5,5] }
  ],
  "teachers": [
    { "teacher_id": "T1", "name": "Mr. Otieno", "max_periods_week": 24, "specialist": false, "confidence": 0.95 }
  ],
  "capabilities": [
    { "teacher_id": "T1", "subject_code": "MATH", "grades_can_teach": ["G7","G8","G9"], "confidence": 0.95 }
  ],
  "preferences": [
    { "teacher_id": "T1", "subject_code": "MATH", "grades": ["G7","G8","G9"], "priority": 1 }
  ]
}
```

## Output: Assignment Sheet

| Field | Type | Description |
|---|---|---|
| `subject_code` | string | Subject assigned |
| `grade` | string | Grade level (e.g. "G7") |
| `periods` | integer | Periods/week required |
| `teacher_id` | string \| null | Assigned teacher or null (shortfall) |
| `priority_used` | integer (1–3) | Preference tier used for assignment |
| `status` | enum | `Assigned` / `Assigned-Overload` / `Unassigned` |
| `confidence` | float (0–1) | Propagated from contributing rows |
| `flag_note` | string \| null | Carried from low-confidence upstream rows |

Also produces a **workload summary** per teacher and a **shortfall bucket** for unassigned periods.

## Position in the Pipeline

```
Gatechecker → Workload Balancer → Timetable Generator
(validates)    (assigns teachers)   (places in time slots)
```

The Balancer runs only when Gatechecker status is `PASSED` or `PASSED_WITH_WARNINGS`.

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Client-side only — no backend required

## Running Locally

```bash
npm install
npm run dev
```

## License

MIT
