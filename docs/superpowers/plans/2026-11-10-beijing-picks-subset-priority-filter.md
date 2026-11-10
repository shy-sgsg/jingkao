# 北京选岗子集导入与快速筛选实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 允许导入 1–60 个有效岗位，并在选岗页标记重点、优先展示及组合筛选。

**Architecture:** 在现有北京工作区中加密保存重点 ID 与选岗页筛选条件；导入校验只放宽数量不足的情况，其他数据错误仍阻止导入。选岗页从已导入岗位生成筛选项，并在渲染前组合关键词、区县、专业、学历、政治面貌和身份条件。

**Tech Stack:** 原生 JavaScript ES modules、现有 HTML 字符串视图与 delegated DOM events、现有加密工作区存储。

**Spec:** `docs/superpowers/specs/2026-11-10-beijing-picks-subset-priority-filter-design.md`

## Global Constraints

- 仅允许 1–60 个互不重复且可匹配的职位代码；少于 60 个只警告，空文件、超过 60 行、重复、缺失、未知或无效代码阻止导入。
- 导入替换清单；只保留仍在新清单中的重点标记，并清空筛选条件。
- 选岗、重点标记及筛选条件保存在本机加密档案；公共同步投影不包含这些值。
- 不改变资格初核、历史匹配和竞争数据来源，也不改变职位库筛选器或监控功能。
- 仓库指令禁止在用户未要求时新增或运行测试。

## Review Focus

- 手动审阅 1 行、60 行及超过 60 行的预览状态；数量不足应可确认，超量应阻止。
- 手动审阅重复、缺失及未知职位代码仍阻止导入的路径。
- 检查多个筛选条件取交集，清空后恢复全部已导入岗位；关键词重渲染时输入焦点和光标位置保持。
- 检查重点标记重渲染后仍生效，重新导入仅保留交集中的标记。
- 检查同步投影丢弃选岗隐私字段，合并同步数据时保留本地字段。

---

### Task 1: 支持有效子集导入并扩展本地工作区

**Files:**
- Modify: `src/beijing/picks.js`
- Modify: `src/beijing/storage.js`
- Modify: `src/beijing/view.js`
- Modify: `src/app.js`

**Interfaces:**
- `previewBeijingPicksImport(parsed, workspace, positions)` 接受 1–60 个互异有效职位代码；`canImport` 不再要求恰好 60 行，并返回 `isPartial` 数量提示状态。
- 工作区增加 `pickPriorities: string[]` 与 `pickFilters`：`keyword`、`workDistrict`、`majorRaw`、`educationRaw`、`politicalStatusRaw`、`freshGraduateRaw`、`existingIdentityRaw`、`onlyPriority`。
- `applyBeijingPicksImport(workspace, preview)` 替换 `myPicks`，按新 ID 集保留 `pickPriorities`，并将 `pickFilters` 复位。

- [ ] **Step 1: 放宽仅数量不足时的导入校验。** 在 `src/beijing/picks.js` 保留重复、无效、未知、空和超过 60 行错误；不足 60 行改为 `isPartial` 提示，不加入阻断性 `errors`。`applyBeijingPicksImport` 同样校验 1–60 个不同的有效 ID。
- [ ] **Step 2: 扩展本地工作区规范化。** 在 `src/beijing/storage.js` 为重点 ID 和上述筛选字段设置默认值；重点 ID 限于当前 `myPicks`，筛选文本沿用现有 `beijingText` 清洗规则。
- [ ] **Step 3: 更新导入预览文案。** 在 `src/beijing/view.js` 展示有效数 / 60；当 `isPartial` 为真时显示数量提醒，确认按钮仍由 `canImport` 控制；把标题和说明从固定“60 个”改为可导入子集。
- [ ] **Step 4: 更新导入成功流程。** 在 `src/app.js` 清除展开状态并保存新工作区，通知改为实际导入数量。

### Task 2: 实现重点标记和选岗页组合筛选

**Files:**
- Modify: `src/beijing/view.js`
- Modify: `src/app.js`
- Modify: `src/styles.css`

**Interfaces:**
- 选岗视图基于 `workspace.myPicks` 解析职位，读取 `workspace.pickPriorities` 与 `workspace.pickFilters`。
- 文本框 `#beijing-picks-keyword` 实时过滤；筛选控件使用 `data-pick-filter` 标识上述工作区字段；卡片按钮使用 `data-action="beijing-picks-toggle-priority"` 和 `data-position-id`。

- [ ] **Step 1: 在 `src/beijing/view.js` 生成选岗筛选区。** 关键词搜索覆盖代码、单位、职位、区县及职位条件原文；独立下拉选项从当前选岗去重生成；提供“只看重点”和清除筛选；显示匹配数 / 已选数。
- [ ] **Step 2: 在卡片上添加重点操作与排序。** 重点岗位排在普通岗位前，卡片显示重点状态及标为重点 / 取消重点按钮；其余岗位保持导入顺序。
- [ ] **Step 3: 在 `src/app.js` 连接筛选交互。** 关键词输入和独立条件变化后更新 `pickFilters` 并立即重绘；关键词重绘后恢复焦点与选区。清除筛选复位全部字段；重点操作更新 `pickPriorities` 并通过现有 `persistAndRender` 保存。
- [ ] **Step 4: 在 `src/styles.css` 添加筛选区和重点态样式。** 沿用现有表单、按钮和卡片视觉变量，适配窄屏换行。

### Task 3: 保持选岗状态仅在本机同步

**Files:**
- Modify: `src/data/sync.js`
- Modify: `src/app.js`

**Interfaces:**
- 公共同步投影将 `myPicks`、`pickPriorities`、`pickFilters` 置为空默认值，并继续清空 `monitoringSnapshots`。
- 同步合并恢复本地 `myPicks`、`pickPriorities`、`pickFilters` 与 `monitoringSnapshots`。

- [ ] **Step 1: 清理公共同步投影。** 在 `src/data/sync.js` 投影北京市考工作区时移除新加入的重点与筛选字段，避免随同步上传。
- [ ] **Step 2: 保留本地选岗字段。** 在 `src/app.js` 的同步合并处恢复本地重点与筛选字段，并经 `normalizeBeijingWorkspace` 规范化。

## Verification

- 按仓库指令，不新增或运行测试。
- 完成后检查改动 diff，重点核对部分清单阻断条件、筛选交集与同步投影字段。
