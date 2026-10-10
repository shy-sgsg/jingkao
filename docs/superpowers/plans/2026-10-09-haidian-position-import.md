# 海淀区 2024–2026 职位导入实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将海淀区三届可追溯职位逐岗加入现有全市候选库，保留镜像来源等级、未核实状态和原始资格文本；不将区级汇总合成为职位行。

**Architecture:** 沿用 `data/positions_seed.json` 与 `data/source_registry.json` 的现有格式，由 `scripts/build_data.py` 生成 `public/data.json`。先按年度/职位代码导入并验证行数、招录数、重复代码和来源外键，再更新区级审计；所有镜像行保持 `sourceLevel: secondary`，直到与官方原表逐码核对。

**Tech Stack:** JSON seeds, Python 3 / `scripts/build_data.py`, Node.js test suite.

**Spec:** `/home/shy/.codex/attachments/d15c1a73-67de-4162-b593-fc448d2a8235/pasted-text-1.txt` (V3 sections 2, 3, 71, 87–96).

## Global Constraints

- 覆盖北京市 16 区；昌平是重点关注区，不是数据边界。
- 职位区县归属必须可追溯；不以单位所在地推断工作地点。
- 2024–2026 职位行保留职位代码、单位、职位名、招录数、学历、专业原文、备注/资格条件和来源定位。
- 第三方汇总不是职位行，也不是官方分母；镜像职位不标为官方核验。
- 发生来源差异时单独记录，不静默覆盖。

## Review Focus

- 汇总和明细口径：年度区级职位数/招录数与逐岗合计不同则保留差异，不补造岗位。
- 行政区归属：市级或跨区单位不能仅凭“海淀分局”名称推断工作地点。
- 职位代码：检查重复、缺失、跨年度复用与同一年度重复。
- 资格字段：职位详情缺字段时留空并注明未采集，不把“不限”误作缺失。
- 来源状态：所有镜像行均保留第三方 URL，并维持 `secondary` / 待官方复核。

---

### Task 1: 导入海淀 2026 职位镜像行

**Files:**
- Modify: `data/positions_seed.json`
- Modify: `data/source_registry.json`
- Test: `test/haidian-positions.test.js`
- Generate: `public/data.json` via `scripts/build_data.py`

- [x] **Step 1: Write a failing test** asserting the first imported 2026 codes exist, link to registered position-mirror sources, are assigned only from explicit Haidian unit names, and remain secondary/unverified.
- [x] **Step 2: Run the focused test** and confirm it fails because no Haidian position rows are present.
- [x] **Step 3: Add only source-backed rows** from Haidian 2026 unit-detail pages; retain raw education/major text and source URLs.
- [x] **Step 4: Rebuild and run the focused test plus data validation**; compare the collected-code and recruit totals against the third-party aggregate 149/349 without labeling that aggregate official.

### Task 2: Import Haidian 2025 and 2024 position rows

**Files:**
- Modify: `data/positions_seed.json`
- Modify: `data/source_registry.json`
- Test: `test/haidian-positions.test.js`
- Generate: `public/data.json` via `scripts/build_data.py`

- [ ] **Step 1: Add failing count/reconciliation assertions** for each year, using third-party area totals only as discrepancy checks.
- [ ] **Step 2: Collect and import source-backed detail-page rows** with raw qualification text and a per-page source reference.
- [ ] **Step 3: Rebuild, validate unique codes and per-year totals, and retain unresolved differences in the audit.**

### Task 3: Report district coverage and gate integration

**Files:**
- Modify: `research/districts/haidian.md`
- Modify: `research/BEIJING_DATA_AUDIT.md`
- Generate: `public/data.json`, `research/coverage_report.md`
- Test: `test/haidian-positions.test.js` and relevant data/coverage suites

- [ ] **Step 1: Update the report from measured seed data**, including source-level, field completeness, reconciliation, and unresolved official verification.
- [ ] **Step 2: Run the full test suite, `python3 scripts/validate_data.py`, and `git diff --check`.**
- [ ] **Step 3: Commit only the completed Haidian data tranche after a district-year is actually expanded; push only that commit and report any remote failure explicitly.**
