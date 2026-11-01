# Xutorok Digital Menu — Dry-Run Migration Audit Report

- **Timestamp:** `2026-11-01T09:47:58.145Z`
- **Execution Mode:** `dry-run`
- **Target Firebase Project:** `ai-twin-conflicts`
- **Target Restaurant Tenant:** `xutorok` (`restaurants/xutorok`)
- **Primary Source Dataset:** `menu\Xutorok_menu_HY_RU_EN.json`
- **Secondary CSV Dataset:** `menu\Xutorok_menu_HY_RU_EN.csv` (297 data rows)

## 1. Required Audit & Dry-Run Metrics

| Metric | Result |
| :--- | :--- |
| Source products | **297** |
| Unique valid products | **297** |
| Source categories | **29** |
| Existing Firestore products | **0** |
| Existing Firestore categories | **0** |
| Planned category inserts | **29** |
| Planned product inserts | **297** |
| Existing categories (unchanged / skipped) | **0** |
| Existing products (unchanged / skipped) | **0** |
| Potential category updates / conflicts | **0** |
| Potential product updates / conflicts | **0** |
| Duplicate records | **0** (0 duplicate IDs or identical category+name tuples in source) |
| Invalid records | **0** (all 297 records pass Zod schema & AMD price checks) |
| Missing category relationships | **0** |
| Missing images | **297** (source menu JSON has 0 standalone photo files; clean placeholders used) |
| Translation gaps | **0** (all 297 products and 29 categories have HY, RU, and EN names) |
| Tenant conflicts | **0** |
| Schema conflicts | **0** |
| Expected final Firestore categories | **29** |
| Expected final Firestore products | **297** |
