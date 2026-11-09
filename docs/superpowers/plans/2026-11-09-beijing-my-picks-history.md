# 北京京考我的选岗与历年竞争资料实施计划

> **For agentic workers:** 本计划由当前 Codex 会话内联执行。按工作区要求不新增或运行测试；交付前检查改动并运行项目构建。

**Goal:** 将 2027 北京市考职位入口并入“北京京考职位决策”，新增基于用户 CSV 的“我的选岗”页，为选中职位展示可追溯的往届同岗和条件近似岗位竞争数据，并将所有比较上限改为 10。

**Architecture:** 将 CSV 解析、岗位清单和历史比较证据放在北京考工作区模块中。60 个代码仅保存在本机加密账户；历史证据运行时从现有职位、观察、分数及来源资料生成。将清单排除在公开明文的云同步投影之外，并在云同步写回本机时保留本机清单。

**Tech Stack:** 原生 JavaScript ES modules、现有静态 SPA、本机加密存储、`public/data.json` 历史资料；不增加运行时依赖。

**Spec:** `docs/superpowers/specs/2026-11-09-beijing-my-picks-history-design.md`

## 全局约束

- 完整目标分阶段交付：先完成历年资料页与比较上限，再执行本计划中的岗位监控 Task 6–9。
- 只从 CSV 导入职位代码；不导入个人资格结论或个人备注。
- 个人清单保存在本机加密账户，不写入公开静态数据或云同步明文备份。
- 历史职位不能仅凭跨年代码关联；同岗匹配需核对单位和职位名。
- 条件近似匹配需有同单位、名称相近的招录部门或同区关系，以及至少一项可核查的报名条件交集；同一或名称相近部门可以用学历交集，同区异部门需有专业、政治面貌、应届或经历条件交集，或两岗专业均明确不限且学历层级有交集。若 2027 职位的区县字段只有“北京市本级”，可从明确的“X区分局”部门名称推定区县并在页面标出推定性质。职能关键词仅作补充依据，通用岗位名本身不构成匹配。
- 报名人数、过审人数、统计时点和进面分保持来源口径；空值不转成零，不把汇总样本当成岗位数据。
- 历史北京职位库、国考、浙江省考和 2027 北京市考的比较上限统一为 10。

## 文件与职责

- `src/beijing/storage.js`：北京工作区规范化、选岗代码清单和比较上限。
- `src/beijing/picks.js`：用户 CSV 解析、岗位代码匹配、预览与确认导入。
- `src/beijing/history.js`：同岗与条件近似历史记录检索、竞争比例计算和来源证据整理。
- `src/beijing/monitoring.js`：官方补录 CSV、第三方快照预览、逐指标来源保留及比值 / 排序数据。
- `src/beijing/view.js`：我的选岗卡片、历年资料、CSV 导入预览。
- `src/app.js`：导航归组、CSV 交互、云同步本机清单与监控数据保留、各比较入口的提示与旧版上限更新。
- `src/data/github.js`、`.github/workflows/beijing-monitor-refresh.yml`、`scripts/refresh_beijing_monitor.mjs`：提交北京公开监控刷新任务、抓取华图全量职位并将公开快照写入 `sync-data`。
- `src/national/storage.js`, `src/national/view.js`, `src/zhejiang/storage.js`, `src/zhejiang/view.js`：国考、浙江比较上限与文案。
- `src/styles.css`：选岗证据区及横向比较表在小屏幕下的布局。

## 实施步骤

### Task 1: 安全导入并保存我的选岗

**接口：** `parseBeijingPicksCsv(text, positions)` 返回逐行解析与错误；`previewBeijingPicksImport(parsed, workspace, positions)` 返回 60 个职位的匹配预览；`applyBeijingPicksImport(workspace, preview)` 只保存唯一有效的 `positionId` 清单。

- [ ] 在 `src/beijing/picks.js` 解析 UTF-8 BOM、引号/逗号/换行 CSV；只读取 `职位代码` 列。
- [ ] 按 `beijing:2027:<positionCode>` 与当年职位表精确匹配；重复代码、未知代码、重复记录和错误表头阻止整批确认。
- [ ] 在 `src/beijing/storage.js` 保存 `myPicks`；规范化时只接受当前 2027 北京职位 ID，去重并保留顺序。
- [ ] 在 `src/data/sync.js` 的公开同步投影中去除 `beijingWorkspace.myPicks`；在 `src/app.js` 确认云同步后，将本机清单合并回本机存储，避免云端替换清空本机选岗。
- [ ] 确认加密账户与加密备份仍保留 `myPicks`；公开同步 JSON 和静态资源不出现所选 60 个代码。

**交付检查：** 预览精确匹配 60 个唯一岗位；出现重复或未知代码时无部分写入；云同步投影不含 `myPicks`，云同步写回后本机仍保留清单。

### Task 2: 生成可解释的历年同岗和近似岗位证据

**接口：** `buildBeijingHistoricalComparisons(position, dataset)` 返回 `{ directMatches, similarMatches }`；每条记录含历史职位、年份、计划数、报名/过审观察、可计算比例、进面分样本、匹配理由及来源链接。

- [ ] 在 `src/beijing/history.js` 建立历史岗位索引，使用 `year + positionCode` 连接历史职位、观察、分数和来源。
- [ ] 同岗只接受单位名与职位名相同；代码相同但单位或岗位名不同时拒绝匹配。
- [x] 条件近似根据报名条件与招录部门/区县关系筛选；同一或相近部门允许学历交集作为依据，同区异部门需有专业、政治面貌、应届或经历条件交集，或两岗专业均明确不限且学历层级有交集；“北京市本级”的分局职位可按部门名称推定区县并在页面说明，职能关键词仅作补充，通用岗位名不单独匹配。
- [ ] 竞争数据只取 `scope === 'position-level'` 的观察；报名与过审分开计算。分母取历史职位招录计划；分母或计数未知时比例留空。
- [ ] 进面分只取可唯一定位到历史职位、映射置信度为高且来源年份无冲突的样本；显示“第三方公开样本”和来源，不显示笔试合格线。
- [ ] 从来源表解析标题、URL、来源层级与已知访问/统计时间；重复年份快照按时点分别列示，不将不同年份合并成单一比值。

**交付检查：** 60 个目标岗位都能生成证据结果；缺少合格直接或近似候选时相应列表为空并说明缺少证据；历史代码误复用不会跨单位连接；所有数字可回到来源记录。

### Task 3: 增加独立我的选岗页面并调整导航

**接口：** 新的 `renderBeijingPicksPage({ positions, workspace, dataset })` 渲染用户选中的 2027 职位及历年竞争资料，并提供 CSV 导入预览与确认操作。

- [ ] 在 `src/app.js` 页面元数据与导航组中，把 `beijing` 放入“北京京考职位决策”，移除独立“北京市考”组，增加 `myBeijingPicks` 独立入口。
- [ ] 在 `src/beijing/view.js` 显示 60 个选中岗位，每个岗位包含原始 2027 条件和“历年竞争资料”区；同岗与相近岗位分开展示，注明匹配理由。
- [ ] 在应用事件处理中连接文件选择、预览、取消、确认、账户加密保存；切换页面或取消时不写入预览数据。
- [ ] 加入清单为空、CSV 无效、代码未匹配、重复记录和历史资料缺失的状态提示。
- [ ] 不显示 CSV 中的“个人资格初核”和“个人备注”，不在公开数据文件中加入这 60 个位置 ID。

**交付检查：** 用户在独立导航入口选择 CSV 后，页面显示匹配的 60 个职位与各自历史证据；个人字段没有进入页面清单、公开资源或云同步投影。

### Task 4: 把所有比较清单上限统一为 10

- [ ] 在 `src/app.js`、`src/beijing/storage.js`、`src/national/storage.js`、`src/zhejiang/storage.js` 将载入截断和添加上限统一为 10。
- [ ] 更新 `src/app.js`、`src/beijing/view.js`、`src/national/view.js`、`src/zhejiang/view.js` 中的页头、概览数字、空状态及超限提示。
- [ ] 保留已保存顺序、上移/下移、清空、导出和差异显示行为；北京历史职位比较的 5 个上限同时改为 10。

**交付检查：** 四类比较入口可持有 10 个岗位，显示 10/10；尝试加入第 11 个时给出上限提示；比较和导出中的列数一致。

### Task 5: 版式与交付检查

- [ ] 在 `src/styles.css` 添加必要的选岗证据区样式；10 列比较表沿用可横向滚动容器。
- [ ] 检查构建清单是否需要登记新模块，并按现有模块顺序接入。
- [ ] 检查代码差异和生成构建；不新增或运行自动化测试。
- [x] 将第二阶段岗位监控单独列为 Task 6–9；第一阶段完成后继续实现第三方自动更新和官方手动补录。

**交付检查：** 生产构建成功；入口、CSV 导入、证据显示及 10 个比较列均在页面上可见；完整目标仍保留监控阶段。

### Task 6: 增加本机逐指标监控数据与官方补录

**接口：** `parseBeijingMonitorCsv(text, positions, myPicks)`、`previewBeijingMonitorImport(parsed, workspace)`、`applyBeijingMonitorImport(workspace, preview, importedAt)`。报名人数与过审人数分别保存为 `{ value, sourceType, sourceName, sourceUrl, sourceUpdatedAt, observedAt, importedAt }`，`sourceType` 为 `official` 或 `third-party`。

- [x] 在 `src/beijing/storage.js` 加入 `monitoringSnapshots` 及筛选 / 排序状态；规范化只接受当前 2027 北京职位 ID、非负整数或空值、合法来源类型和时间。
- [x] 在 `src/beijing/monitoring.js` 解析官方岗位级 CSV，列名为 `position_code,applications,qualified,source_name,source_url,source_updated_at,observed_at`；只允许当前职位表中且已在 `myPicks` 中的代码，重复、未知、非选岗代码或格式错误阻止整批确认。
- [x] 对报名和过审两个指标分别合并：空白跳过不清除旧值，明确 0 保留；较旧 `observed_at` 不覆盖较新值，同一时点的官方来源优先于第三方来源。
- [x] 官方补录确认后只写入当前账户的加密状态；不把报名人数 / 过审人数转成跨选岗的共享明文数据。

**交付检查：** 只补过审值的 CSV 不会清除旧报名值；零值和未知有区别；非选岗代码、重复职位代码、无效时间或链接不能部分写入。

### Task 7: 接入华图 2027 北京京考公开统计

**接口：** `dispatchBeijingMonitorRefresh({ token, requestId })`、`readPublicBeijingMonitorSnapshot({ requestId })`；快照 schema 包含 `requestId, fetchedAt, sourceUpdatedAt, expectedPositionCount, records`，每行按唯一 9 位 `positionCode` 关联当前公开职位。

- [x] 在 `scripts/refresh_beijing_monitor.mjs` 从华图地区页引用的 `2027.js` 读取职位目录，并从统计页读取公开报名人数；只访问 `https://ah.huatu.com/zw/bjgwy/` 下的公开页面与职位脚本，不执行远程脚本。
- [x] 以 `public/beijing/positions-2027.json` 的 1,446 个唯一职位代码核对覆盖；缺代码、重复代码、职位数不符或字段解析异常时整次失败，不发布部分快照。地区职位脚本提供完整代码，统计页只在“招聘人数最多的十大职位”表中提供 10 个岗位的人数。
- [x] 报名开始时间之前将第三方页面的预置零值写为 `null`；开始后保留统计页明确显示的 0；华图来源没有提供过审人数时该指标保持 `null`，等待官方 CSV 补录。
- [x] 新增 `.github/workflows/beijing-monitor-refresh.yml`，通过 `beijing-monitor-refresh` repository dispatch 在 GitHub Actions 运行抓取，将完整公开快照写入 `sync-data/monitoring/beijing-2027.json`。
- [x] 在 `src/data/github.js` 增加刷新派发和快照读取；校验 requestId、schema、完整职位覆盖、唯一职位代码、非负数值及来源域名；错误快照不得进入本机数据。
- [x] 抓取任务只使用全量公开职位表，不传入 `myPicks`、收藏或账户信息。

**交付检查：** 解析快照恰有 1,446 个唯一代码；覆盖不足或来源网址越界时不写入；未开始时报名数字为空，开始后真实的 0 仍保留。

### Task 8: 在北京职位页加入“岗位监控”标签

**接口：** `renderBeijingWorkspace({ ..., tab: 'monitor', monitorImportPreview, monitorRefreshPreview })` 只对 `workspace.myPicks` 中的职位计算和展示监控结果。

- [x] 在 `src/app.js` 与 `src/beijing/view.js` 增加“岗位监控”标签、从华图刷新、官方 CSV 导入 / 预览 / 确认和取消；刷新操作复用同步设置中的 GitHub Token，抓取不发送 60 个职位代码。
- [x] 显示招录单位、职位名 / 代码、计划数、最新报名、最新过审、报名 / 计划、过审 / 计划、两个指标各自的统计时间和来源。
- [x] 添加关键词筛选、报名人数下限、过审人数下限、报名 / 计划下限、过审 / 计划下限；四项数据均可升降序排序；空值不参与数字比较并排在有效值之后。
- [x] 报名尚未开始时显示官方开始时间和暂无数据；缺失数据不伪装为 0。无选岗清单时引导用户先导入 60 个代码。
- [x] 在 `src/data/sync.js` 的公开投影中同时清空 `myPicks` 和 `monitoringSnapshots`；在 `src/app.js` 同步写回时将本机选岗清单与监控快照保留在本机。
- [x] 在 `scripts/build.mjs` 登记北京监控模块；样式沿用北京工作区的窄屏横向表格容器。

**交付检查：** 页面仅列已选职位；自动数据和官方补录按各自来源 / 时间显示；四个数值筛选与四项排序生效；云同步 JSON 不包含选岗代码或以选岗为键的监控数据。

### Task 9: 岗位监控阶段交付检查

- [ ] 在 GitHub Actions 运行抓取；该工作流尚未推送并触发。
- [x] 直接读取华图公开页面并运行本地采集器：17 个地区脚本共解析 1,446 个唯一职位代码，与职位表完全匹配；核对了官方公告开始时间。统计页只有“招聘人数最多的十大职位”中的 10 条报名人数，当前报名尚未开始，因此预置 0 全部转为空值；过审人数没有公开岗位级字段。官方 CSV 预览、合并规则和表格字段已按界面实现核对。
- [x] 运行 `npm run build` 和 `git diff --check`；按工作区指令不新增或运行测试。

**当前验证限制：** 本地采集器已通过公开页面核验，且完整覆盖校验失败时会停止发布。GitHub Actions 尚未触发；报名开始后统计页实际人数值的格式也尚未出现，届时需再核对。华图目前仅公开“招聘人数最多的十大职位”的报名人数，不公开全量岗位或岗位级过审人数。

**交付检查：** 完整目标中的 60 个历史岗位资料、岗位监控、官方补录、筛选 / 排序和 10 岗比较均有可检查实现；发布前的公开快照采集无缺码或重复码。

## Review Focus

- CSV 的 BOM、带逗号和换行的引号字段、重复/未知职位代码会影响是否能导入 60 条清单。
- 同一单位同一通用岗位名可能对应多个历史职位；不能把单位/职位名相同等同于历史科室完全相同。
- 目标专业代码与历史专业目录粒度不同；相似性依据必须保留具体代码与匹配层级。
- 同一职位有多个报名快照；必须按年份和统计时点分别展示，不能用旧值覆盖更新值。
- 进面分映射虽标为高置信，也仍是第三方来源；单位、岗位名或年份有歧义时不能显示为确定分数。
- 云同步写回不得清除本机选岗；公开同步投影不能包含个性化代码清单。
- 10 列比较在窄屏幕仍应能横向滚动，且第 11 个职位不能进入清单。
