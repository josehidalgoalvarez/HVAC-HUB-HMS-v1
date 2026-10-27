# Past Work Order Batch Import Specification

## Overview
This document specifies the batch JSON format for importing past work-order context into HVACHome (`cli/import_past_wos.php`).

Imported past work orders provide historical context (previous repairs, symptoms, recurring issues) for units and appliances. They are imported through an idempotent, machine-verified pipeline.

---

## JSON Format

The import file must contain a JSON array of past work order objects:

```json
[
  {
    "wo_number": "WO-10492",
    "property": "1719 Bath Road",
    "unit": "273",
    "description_verbatim": "Tenant states refrigerator crisper drawer cracked and bottom shelf sagging.",
    "status": "closed",
    "priority": "medium",
    "opened_date": "2025-08-14 09:30:00",
    "scheduled_date": "2025-08-15 13:00:00",
    "parent_wo_number": null
  }
]
```

### Field Definitions

| Field | Type | Required | Description & Constraints |
| :--- | :--- | :--- | :--- |
| `wo_number` | string | **Yes** | Work order identifier (e.g. `WO-10492`, `10492`). Used as unique key for deduplication. |
| `property` | string | **Yes** | Property identifier as shown in Yardi: Yardi property code (e.g. `bd1719`, `300skyf`), building name (e.g. `1719 Bath Road`), or alias. |
| `unit` | string | **Yes** | Unit label as shown in Yardi (e.g. `273`, `101`, `TH4`). |
| `description_verbatim` | string | **Yes** | Exact Yardi text, never paraphrased or summarized. Stored byte-identical in both `verbatim_text` and `description`. |
| `status` | string | **Yes** | Work order status. Standard values: `open`, `in-progress`, `on_hold` / `on-hold`, `closed` / `done`. |
| `priority` | string | No | Priority level if shown (`low`, `medium`, `high`, `urgent`). Defaults to `medium` if null or omitted. |
| `opened_date` | string \| null | No | Datetime or date string when opened in Yardi (e.g. `2025-08-14 09:30:00`), or `null`. |
| `scheduled_date` | string \| null | No | Scheduled datetime or date string if shown, or `null`. |
| `parent_wo_number` | string \| null | No | Parent work order number if this is a child work order; otherwise `null`. |

---

## Pipeline Rules

1. **Deduplication on `wo_number` / `external_id`**:
   - If a work order with the given `wo_number` (or `external_id`) already exists in the database, the row is **SKIPPED**.
   - Existing work orders are never updated, overwritten, or duplicated.
2. **Strict Roster Verification**:
   - The `property` and `unit` must resolve cleanly against the verified portfolio roster (96 buildings, 1,289 verified units).
   - If a property or unit cannot be resolved, the row **FAILS LOUDLY** with a descriptive reason.
   - Buildings or units are **NEVER invented**.
3. **Status Preservation**:
   - `on_hold` (or `on-hold`) imports strictly as `on-hold`.
   - `closed` or `done` imports as `closed`.
   - `open` imports as `verified` or `new`.
4. **Byte-Identical Verbatim Text**:
   - `description_verbatim` is stored exactly as extracted from Yardi without truncation, sanitization, or paraphrasing.
5. **Parent Linkage & Missing Parent Handling**:
   - If `parent_wo_number` is provided and the parent work order already exists in the database, the child ticket is linked via `parent_ticket_id`.
   - If the parent work order does not exist in the database yet, the child ticket is imported as **unlinked** (`parent_ticket_id = null`) and **flagged** in the import summary report. A parent ticket is **NEVER invented**.
6. **Provenance Timeline Event**:
   - Every successfully imported ticket receives an append-only timeline event (`ticket_timeline`) recording that it was imported as past-work-order context with its original metadata.
7. **Dry-Run by Default**:
   - `cli/import_past_wos.php` runs with `--dry-run` by default to simulate and report the import without modifying the database. Passing `--run` commits the import.
