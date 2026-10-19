# 国考收藏岗位在线监控刷新实施计划

> **For agentic workers:** 本计划由当前 Codex 会话内联执行。受上级任务指令约束，不新增或运行测试；部署前运行项目构建。

**Goal:** 增加一个从华图获取最新逐岗统计、并只更新本机收藏岗位监控快照的按钮。

**Architecture:** 页面用现有仓库 Contents 写令牌发送不含收藏信息的 `repository_dispatch` 请求。GitHub Actions 抓取华图 2027 省级页及其子页面，将完整公开统计快照写到 `sync-data` 的独立文件；页面读取后本机匹配职位代码，预览后确认写入加密档案。

**Tech Stack:** GitHub Pages, GitHub REST API, GitHub Actions, Node.js 22, 原生 `fetch` 与 JavaScript。

**Spec:** [national-monitor-live-refresh.md](../specs/national-monitor-live-refresh.md)

## Global Constraints

- 收藏职位代码、个人收藏、备注和账户数据不得放入 dispatch 请求或公开监控快照。
- 只更新现有收藏岗位的监控快照；不改动收藏、备注、优先级或筛选状态。
- 来源为华图 2027 岗位统计页；必须保留来源链接、来源更新时间和采集时间。
- 只有完整抓取后才覆盖 `sync-data` 上一份有效快照。
- 保留现有 CSV 导入和个人备份导入行为。
- 不新增依赖；不新增或运行测试，按上级指令执行。

## Review Focus

- 华图页面改版、缺页或返回错误时，Action 必须失败且不覆盖可用快照。
- 相同职位代码在多个页面出现且数值冲突时，不应任意选值。
- 用户收藏代码未出现在华图快照中时，应计入未匹配并保持该职位本机旧快照。
- Action 仍在排队或超时、raw 文件被缓存时，按钮不能误读旧请求快照。
- Token 缺失或权限不足时，应给出可操作提示且不改本机数据。

---

### Task 1: 华图公开数据采集与发布

**Files:**
- Create: `scripts/refresh_national_monitor.mjs`
- Create: `.github/workflows/national-monitor-refresh.yml`

**Interfaces:**
- Consumes: `repository_dispatch` event `national-monitor-refresh` with `client_payload.requestId` only.
- Produces: public `sync-data/monitoring/national-2027.json` containing `schemaVersion`, `year`, `requestId`, `fetchedAt`, `sourceUpdatedAt`, `expectedPositionCount`, and `records`; each record has `positionCode`, nullable `applications`, nullable `qualified`, and `sourceUrl`.

- [x] Build a bounded same-host crawler for Huatu `/zw/<province>/` pages and linked city/unit pages; parse job table columns by header labels.
- [x] Collect provincial declared position totals and require unique parsed position codes to cover the declared total before writing output.
- [x] Fetch the national statistics page to capture its displayed update timestamp; leave it blank only when the source omits it.
- [x] Add an Actions workflow triggered only by the approved dispatch event; write the generated public snapshot to `sync-data` with `contents: write`, leaving `user-data/backup.json` untouched.
- [x] Verify the script's syntax and the site build; do not run tests.

### Task 2: Trigger and read public refresh snapshot

**Files:**
- Modify: `src/data/github.js`

**Interfaces:**
- Consumes: existing repository target and user-configured Contents write token.
- Produces: `dispatchNationalMonitorRefresh({ token, requestId, fetchImpl })` and `readPublicNationalMonitorSnapshot({ requestId, fetchImpl })`; reader returns the validated matching snapshot or `null` while unavailable/stale.

- [x] Add the fixed repository dispatch event and send only the random request ID.
- [x] Read the public raw snapshot without GitHub REST API calls, cache-busting by request ID and rejecting malformed or mismatched files.

### Task 3: Local matching, preview, and UI action

**Files:**
- Modify: `src/national/monitoring.js`
- Modify: `src/national/view.js`
- Modify: `src/app.js`
- Modify: `src/styles.css` only if the existing import layout needs spacing for the button.

**Interfaces:**
- Consumes: validated public snapshot from Task 2, all `nationalPositions`, local `nationalWorkspace`, and existing encrypted `persist()`.
- Produces: `previewPositionMonitorWebsiteRefresh(snapshot, workspace, positions)` and `applyPositionMonitorWebsiteRefresh(workspace, preview, importedAt)`; preview includes matches and missing count, apply touches only `monitoringSnapshots` for existing favorites.

- [x] Add a button that triggers the server refresh, polls until its request ID appears or a fixed timeout expires, then presents a preview with source timestamp and matched/missing counts.
- [x] Add a confirmation action that applies matched snapshots to the local encrypted workspace and reports completion; preserve old snapshots for unmatched positions.
- [x] Handle no favorites, absent token, permission failure, workflow timeout, invalid source data, and persistence failure without modifying existing favorites or snapshots.
- [x] Verify the site build; do not run tests.
