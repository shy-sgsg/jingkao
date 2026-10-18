# 国考岗位监控模块实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 2027 国考职位工作区增加本机岗位监控、复合身份 CSV 导入、收藏筛选和最新报名数据比较。

**Architecture:** 将监控快照放在现有 `nationalWorkspace` 中，收藏记录保留 `localOnly` 兼容字段。新建纯逻辑模块负责应届原文分类、CSV 解析/预览/原子提交和竞争比计算；页面负责显示及导入交互。按用户明确授权，岗位收藏和快照经现有手动同步写入明文 `sync-data` 分支；监控筛选状态留在本机。

**Tech Stack:** 原生 JavaScript ES modules、现有静态 SPA 与加密存储，无新增依赖、后端或自动抓取。

**Spec:** `docs/superpowers/specs/2026-10-18-national-position-watch.md`

## 全局约束

- 职位以站内 `position.id`（部门代码与职位代码组合）匹配。
- 65 行初始 CSV 保持在 `京考` 仓库之外；代码和公开职位资源不包含个性化职位清单。
- 用户明确授权将岗位收藏和快照写入现有明文 GitHub `sync-data` 分支；同步投影剔除设备内部的 `localOnly` 标记，保留收藏、备注、比较项和快照。监控筛选状态只留本机。本机加密账户和加密备份保留完整工作区。
- 不增加自动抓取、后端、定时任务或运行时依赖。
- 本任务不新增或运行测试；实现期间按既有数据流和交互逐项检查。

## 接口约定

- `nationalWorkspace.monitoringSnapshots` 是以 `positionId` 为键的对象；值形如 `{ applications, qualified, sourceName, sourceUrl, sourceUpdatedAt, observedAt, importedAt }`。未知计数为 `null`，`0` 保持数值零。
- 收藏记录增加 `localOnly: boolean`，普通收藏缺省为 `false`。
- `src/national/monitoring.js` 导出 `classifyFreshGraduateRequirement(position)`、`parsePositionMonitorCsv(text, positions)`、`previewPositionMonitorImport(parsed, workspace, positions)`、`applyPositionMonitorImport(workspace, preview, importedAt)` 和 `calculateCompetitionRatios(position, snapshot)`。
- 预览包含逐行复合身份、可读错误及新增收藏/已存在收藏/有效快照/重复键/未知职位/格式错误计数。存在重复键、未知职位或格式错误时 `canImport` 为 `false`；提交函数拒绝无效预览。
- `applyPositionMonitorImport` 只处理 CSV 中的职位；保留既有 `addedAt`、`note`、`priority`，将收藏设为可手动同步，按行覆盖这些职位的当前快照，且不触碰缺席职位。

## 实施步骤

### 1. 建立监控状态与 CSV 领域逻辑

- [x] 在 `src/national/storage.js` 中让 `normalizeNationalWorkspace` 保留合法 `localOnly` 标记和 `monitoringSnapshots`；清理非法职位键与错误快照类型。`emptyNationalWorkspace()` 初始化空快照对象。
- [x] 新建 `src/national/monitoring.js`。实现支持 UTF-8 BOM、引号逗号、双引号转义和 CRLF 的 CSV 解析；要求规格中列出的 8 个列名。只接受非负整数计数或空值，并将空值规范为 `null`。
- [x] 在 `scripts/build.mjs` 的静态打包清单中把 `src/national/monitoring.js` 放在 `storage.js` 后、`view.js` 前，确保源码模式与独立构建都能解析同一模块。
- [x] 用部门代码与职位代码组合匹配 `positions`。预览识别重复组合键、未知职位、错误行或计数，并阻止有任一问题的整批提交。
- [x] 实现原子提交：按 `Date` 注入的 `importedAt` 写入快照，并作为新增收藏的 `addedAt`；导入收藏设为可手动同步；导入缺席的收藏和快照不变。
- [x] 实现应届分类：综合 `freshGraduateRaw` 和 `remarkRaw`；有互相矛盾的应届/非应届或“不限”线索时标为人工核验，有明确应届措辞时标为明确要求，没有应届措辞时标为原文未提及。实现人数除以计划招录的两种比值，未知或计划数非正时返回空值。

**交付检查：** 领域函数接口与上述约定一致；CSV 校验失败时不能生成可提交预览；无效快照不能被标准化成零。

### 2. 接通监控数据的现有手动同步

- [x] 在 `src/data/sync.js` 的 `projectUserData()` 中保留岗位收藏、备注、并排比较 ID 和 `monitoringSnapshots`，删除收藏上的设备内部标记，并清空监控筛选状态；其它现有同步字段保持原行为。
- [x] 在 `src/app.js` 的 GitHub 同步确认路径中保留远端合并结果中的岗位监控数据；写回本机时仅恢复本机监控筛选状态，不覆盖已合并的收藏或快照。确保用户数据加密备份走现有完整 `nationalWorkspace` 序列化路径。

**交付检查：** 同步投影保留岗位收藏与快照、不含 `localOnly` 标记；本机写回路径恢复本机筛选状态。

### 3. 增加岗位监控视图

- [x] 在 `src/national/view.js` 添加“岗位监控”标签和 tab 渲染分支；保留现有四个标签。
- [x] 表格只显示收藏职位；提供关键词、工作城市、应届分类和收藏优先级组合筛选。将个人资格初核结果单独呈现，不作为应届分类依据。
- [x] 展示规格要求的职位、招录计划、报名与过审人数、两种竞争比、来源更新时间、采集时间、导入时间及来源链接。两种竞争比可点表头排序；未知值留空、明确零值显示 `0`。空来源更新时间显示指定文案。
- [x] 加入 CSV 文件选择和导入预览区，预览展示行错误及全部规定计数；只有 `canImport` 时提供确认按钮。提交后显示当前快照，不显示历史趋势。

**交付检查：** tab 路由接受监控视图；组合筛选不混淆原文应届分类与个人资格初核。

### 4. 接通导入交互与本机持久化

- [x] 在 `src/app.js` 引入监控领域函数，维护仅存在于当前界面的导入预览状态；所选文件读取后生成预览，不立即写入账户。
- [x] 确认操作调用原子提交，写回 `storage.nationalWorkspace` 并加密保存；拒绝无效预览。取消或换文件时清除旧预览。
- [x] 将岗位监控加入 tab 参数白名单；筛选与排序状态按现有工作区模式维护，且不改变普通收藏的现有收藏/备注/优先级交互。

**交付检查：** 预览阶段账户状态不变；确认后一次性保存；刷新后快照和可同步收藏仍存在。

### 5. 添加监控表格样式

- [x] 在 `src/styles.css` 为监控筛选器、预览错误和宽表格添加局部样式；小屏表格可横向滚动，不改动其他页面样式。

**交付检查：** 使用现有 CSS 与响应式断点，不引入新资源或依赖。

## 自审重点

- 规格覆盖：标签、职位表字段、四类筛选、两种排序比值、原文分类与资格初核分离、CSV 校验及原子写入、缺席岗位保留、重复导入更新、手动同步岗位收藏和快照、本机加密保留、无后端与依赖均有对应步骤。
- 输入边界：BOM、CRLF、带逗号字段、引号转义、空计数、零计数、重复复合键、未知职位、负数/小数/文本计数、缺少来源更新时间均已列入领域逻辑或视图检查。
- 现有未提交改动位于其他资料文件；实施只编辑本计划列出的岗位监控代码与本计划文件。
