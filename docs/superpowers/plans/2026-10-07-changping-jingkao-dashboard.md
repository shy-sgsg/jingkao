# 昌平京考决策工作台实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 尽可能完整整理 2024–2026 昌平区直/街道/镇京考职位与可追溯竞争/分数证据（2022–2023 有可靠数据时扩展），并交付本机可运行的选岗与50天备考决策网站和研究结论。

**Architecture:** 先从官方年度职位简章/公告取得 2024–2026 全量昌平行级记录，按职位代码与结构化镜像交叉核对，并补充可证实的竞争/分数观察；2022–2023 仅在找到可追溯来源时纳入。Python/openpyxl 只读提取原工作簿，将工作簿计划、职位事实、竞争/成绩观察及字段级来源证据校验后导出到 `data/processed/` 和前端 JSON。React/Vite 单页应用消费该 JSON；学习日志、个人资格和偏好、收藏及比较列表只保存在浏览器 localStorage。统计、资格判断和评分放入可单测的纯函数；证据不足的比较在报告与网站中保持“暂无可靠数据”。

**Tech Stack:** React、Vite、TypeScript、Tailwind CSS、Recharts；Python、openpyxl；Vitest；浏览器 localStorage。

**Spec:** `docs/superpowers/specs/2026-10-07-changping-jingkao-dashboard-design.md`

## Global Constraints

- 前端：React、Vite、TypeScript、Tailwind CSS、Recharts；本地静态单页应用，不设后端、不引入 SQLite。
- 数据转换：Python 与 openpyxl。ETL读取原始Excel副本和项目内的岗位/来源表，将校验后的数据输出到前端可读的JSON。
- 个人数据：报考条件、完成状态、模考记录、收藏与对比列表保存在浏览器 localStorage；不上传，也不回写原始Excel。
- 运行入口：项目根目录提供 start.sh 和 README；数据更新通过 scripts/rebuild_data.sh 完成，前端开发与生产构建分别使用 npm scripts。
- 原始文件：复制用户指定工作簿到 data/raw/，只读处理；保留原文件不变。更新工作簿后重新运行ETL，网站数据从表格重建。
- 职位事实与报名/成绩观察分开存储，来源证据独立成表。处理后的JSON使用稳定ID互相引用。
- 没有证据的值为 null，不为0。只有资格审查通过人数时，指标名为 qualified_competition_ratio = applicants_qualified / recruit_count。
- 官方合格线是资格线，不是职位实际进面线。
- 硬筛选结果只有“符合”“不符合”“待补充”“待人工核验”。岗位文本缺失、专业代码映射不确定或个人信息为空，不会被默认当作符合。
- 不得展示预测职位。
- 不输出“上岸概率/进面概率”。
- 使用系统中文字体栈，不依赖远程字体。
- 建立“昌平区公务员岗位历史数据库”，优先覆盖 2024–2026；仅在数据可得且可追溯时扩展到 2022–2023。
- 职位记录只来自当年官方职位表或可追溯的结构化镜像；不根据街道/乡镇名录补造岗位。
- 用户只预置“公共管理专业”；最高学历、学位、应届、户籍/生源、政治面貌、基层经历、证书、退役身份等由用户填写。
- 原始任务要求的岗位体系、区直/街道/镇比较、分数情景（125/130/135/138/140/145）、Excel评审、研究报告、质量报告、完整网站页面和最终摘要均属于交付范围；数据不可得时说明具体缺口，不删减问题后冒称完成。

## Review Focus

1. 工作簿空白成绩/计划字段与显式数值 0 的区别：ETL 测试 `test_blank_mock_fields_stay_null_and_explicit_zero_is_preserved`。
2. 职位代码重复、来源悬空、年度或竞争指标口径错配：ETL 测试 `test_duplicate_position_key_and_orphan_source_are_errors`、`test_ratio_type_and_recruit_count_are_validated`。
3. 用户资格字段未填写、专业代码映射不确定：资格测试 `test_missing_or_uncertain_profile_never_returns_qualified`。
4. 可比进面分/职位级竞争数据样本不足或来源冲突：评分与情景测试 `test_missing_core_data_hides_composite_score`、`test_scenario_reports_filtered_sample_denominator`。
5. localStorage 首次为空、内容损坏或用户重新载入：持久化测试 `test_empty_and_invalid_storage_use_safe_defaults`、`test_user_entries_round_trip_without_upload`。

---

## 文件结构与职责

- `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `tailwind.config.*`, `postcss.config.*`, `index.html`：前端依赖、构建和测试配置。
- `data/raw/北京京考50天复习计划_昌平街道导向_自检版.xlsx`：工作簿只读副本；`data/raw/job_tables/` 与 `data/raw/web_snapshots/` 保存可取得的官方附件和原始证据快照；不覆盖用户原文件。
- `data/input/positions.json`、`observations.json`、`sources.json`、`exam_rules.json`：可人工审阅并重建的导入表。职位数据尽量覆盖每一年度官方昌平行；镜像候选行带核验状态；同一事实冲突多源并存。
- `scripts/etl/`：导入工作簿、规范化行级职位/观察、复算质量检查；`scripts/validate_data.py` 输出 `research/data_quality_report.md`。
- `scripts/rebuild_data.sh`：从项目根目录重建 `data/processed/{positions,competition,cutoffs,sources,study_plan}.json` 和 `public/data/app-data.json`。
- `scripts/analyze_positions.py`：按来源、年度、区直/街道/镇、专业和条件分析覆盖、竞争及分数；只在样本量/口径支持时输出分层结论。
- `src/domain/types.ts`：前端数据合同。核心类型为 `AppDataset`、`Position`、`Observation`、`SourceRecord`、`SourceEvidence`、`StudyPlan`、`UserProfile`、`UserPreferences`、`MockRecord`、`UserState`、`JobFilters`。
- `src/domain/study.ts`、`qualification.ts`、`ranking.ts`、`scenario.ts`、`persistence.ts`：独立、可单测的学习统计、硬性资格判断、解释型评分、情景统计和 localStorage 读写。
- `src/data/loadDataset.ts`：加载生成 JSON，并在加载失败时返回可见错误状态，不提供虚构数据回退。
- `src/components/`：通用侧栏/移动导航、状态与来源徽标、表格、指标卡和 Recharts 图表。
- `src/features/dashboard/`、`study/`、`jobs/`、`scenarios/`、`sources/`：各导航页面；详情和比较复用相同的职位与来源合同。
- `src/App.tsx`、`src/main.tsx`、`src/styles.css`：应用壳、导航与中文桌面优先的响应式样式。
- `start.sh`、`README.md`：本地启动、重建数据、数据边界与使用方法。
- `FINAL_SUMMARY.md`：最终研究和实现摘要，记录逐年职位数、报名/进面数据覆盖、关键结论、135/138/140等分数层次、运行/更新命令与实际验收结果。

### 数据合同

- `SourceRecord`: `sourceId`, `title`, `url`, `publisher`, `level` (`official | secondary | estimated`), `evidenceType`, `publishedAt: string | null`, `accessedAt`, `confidence`, `note: string | null`。
- `SourceEvidence`: `evidenceId`, `examYear`, `positionCode: string | null`, `fieldName`, `fieldValue`, `sourceId`, `sourceTitle`, `sourceUrl`, `publisher`, `publishDate`, `accessDate`, `sourceLevel`, `sourceType`, `confidence`, `notes`；一条证据只证明其明确标注的字段/统计范围。
- `Position`: `id`（`examYear + positionCode` 稳定生成）, `examYear`, `positionCode`, `district`, `department`, `agency`, `unit`, `streetOrTown`, `category` (`district | street | town | unknown`), `positionType`, `positionName`, `description: string | null`, `recruitCount: number | null`, `education`, `degree`, `majorCategory`, `majorDetail`, `freshGraduateRequirement`, `hukouRequirement`, `studentOriginRequirement`, `politicalStatus`, `grassrootsExperience`, `qualificationCertificate`, `genderRequirement`, `ageRequirement`, `veteranRequirement`, `specialExam`, `physicalTest`, `professionalTest`, `interviewRatio`, `remarks`, `comparableGroupId: string | null`, `verificationStatus`, `fieldEvidenceIds: Record<string, string[]>`, `rawFields`。
- `Observation`: `id`, `examYear`, `positionId: string | null`, `scope` (`position | unit | district`), `metricType` (`applicants_registered | applicants_qualified | applicants_paid | applicants_confirmed | actual_test_takers | recruit_count | interview_min_score | interview_max_score | interview_mean_score | written_qualifying_line | final_composite_score | unknown_registration_ratio | qualified_competition_ratio`), `value: number | null`, `recruitCount: number | null`, `asOf: string | null`, `numeratorDefinition: string | null`, `sourceEvidenceIds: string[]`, `note: string | null`。
- `StudyPlan`: 工作簿中的 50 个日期/阶段/任务/计划题量/计划分钟数、行测和申论清单；实际完成与模考不从公式缓存读取。
- `AppDataset`: `meta`, `sources`, `sourceEvidence`, `positions`, `observations`, `studyPlan`, `examRules`, `quality`。所有外部字段通过 `fieldEvidenceIds` 或 `sourceEvidenceIds` 关联证据。
- `UserProfile`: `highestEducation`, `educationType`, `majorName`, `majorCode`, `degree`, `freshGraduate`, `graduationYear`, `beijingHukou`, `beijingStudentOrigin`, `politicalStatus`, `grassrootsExperience`, `veteranStatus`, `certificates`；除 `majorName="公共管理"` 外默认未填写。
- `UserPreferences`: `acceptLawEnforcement`, `acceptPhysicalTest`, `acceptTown`, `preferStreet`, `preferDistrict`, `preferredUnits`；未选择的偏好保留 `null`。
- `MockRecord`: `id`, `date`, `xingceScore`, `shenlunScore`, `totalScore`, `moduleQuestionCounts`, `moduleCorrectCounts`, `reviewNotes`；未记录值为 `null`。
- `JobFilters`: `examYear`, `category`, `unit`, `positionType`, `majorQuery`, `education`, `minRecruitCount`, `maxRecruitCount`, `freshGraduate`, `politicalStatus`, `hukou`, `grassrootsExperience`, `physicalTest`, `minCompetition`, `maxCompetition`, `minInterviewScore`, `maxInterviewScore`；“全部”使用 `null` 而非伪造汇总行。
- `UserState`: `profile`, `preferences`, `completedPlanDays`, `studyLogs`, `mockRecords`, `favoritePositionIds`, `comparePositionIds`。默认专业为用户提供的“公共管理”，其他资格信息为空；新安装/损坏数据使用空状态。

### 初始数据边界

现有研究报告中的 5 条职位仅是需复核的起始候选，不是目标数据库上限。研究任务继续下载/解析 2024–2026 官方职位表并按职位代码与结构化镜像核对；若官方附件在可用工具中无法读取，导入覆盖尽可能完整的可追溯二手行并保持 `secondary`/待核标记。2022–2023 仅在原始职位表或可靠镜像可取得时扩展。区级报名快照、区级平均竞争比和部分分数样本按原口径保留为汇总观察，不分摊到职位。2024/2025 来源汇总冲突分别保留，未对账前不拼作趋势。未找到直接职位级证据的过审、缴费、到考和进面分值保持空值。顶部状态用“截至 2026-10-07 官方招考目录未检出普通 2027 职位表”，不生成 2027 职位。

项目当前不是 Git 仓库；计划不包含初始化仓库、创建 worktree 或提交步骤。

## 实施任务

### Task 1：项目脚手架与类型合同

**Files:**
- Create: `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `tailwind.config.js`, `postcss.config.js`
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/domain/types.ts`, `src/data/loadDataset.ts`
- Test: `src/data/loadDataset.test.ts`

**Interfaces:**
- Produces: `loadDataset(): Promise<AppDataset>` 从 `/data/app-data.json` 读取 JSON；请求失败或结构缺失时拒绝并交由 UI 显示错误，不返回示例职位。
- Produces: `AppDataset` 及本计划“数据合同”列出的子类型，所有缺失数值字段均可为 `null`。

- [ ] **Step 1: 建立前端测试/构建配置并写加载边界测试**：在 `package.json`、Vite/Tailwind/Vitest 配置中定义 `dev`、`build`、`test:run`；在 `src/data/loadDataset.test.ts` 验证合法 JSON 可加载，HTTP 错误和缺 `positions` 的 JSON 会拒绝，不会返回假记录。
- [ ] **Step 1a: 检查本机运行环境**：运行 `node --version`、`npm --version`、`python3 --version`、`python3 -c 'import openpyxl; print(openpyxl.__version__)'`；确认实际可用版本后再选择 Vite/TypeScript 配置，不升级全局工具。
- [ ] **Step 2: 安装项目依赖**：运行 `npm install`；预期生成 `package-lock.json`，React/Vite/TypeScript/Tailwind/Recharts/Vitest 依赖安装成功。
- [ ] **Step 3: 运行测试确认失败**：运行 `npm run test:run -- src/data/loadDataset.test.ts`；预期因尚无加载器而失败。
- [ ] **Step 4: 创建最小 React/Vite 入口并实现类型与 `loadDataset`**；Vitest 作为本计划所需测试运行器，不添加 UI 组件库或路由依赖。
- [ ] **Step 5: 运行验证**：`npm run test:run -- src/data/loadDataset.test.ts` 和 `npm run build`；预期测试通过，Vite 生产构建成功。

### Task 2：全量职位调研、只读工作簿 ETL 与质量闸门

**Files:**
- Create: `data/raw/北京京考50天复习计划_昌平街道导向_自检版.xlsx`（从工作区原文件复制）
- Create: `data/raw/job_tables/`（能取得的官方 2024–2026 附件；有可靠来源时继续纳入 2022–2023）和 `data/raw/web_snapshots/`（必要的页面证据快照）
- Create: `data/input/positions.json`, `data/input/observations.json`, `data/input/sources.json`, `data/input/exam_rules.json`
- Create: `scripts/etl/import_excel.py`, `scripts/etl/normalize_positions.py`, `scripts/etl/tests/test_pipeline.py`, `scripts/validate_data.py`, `scripts/analyze_positions.py`, `scripts/rebuild_data.sh`
- Modify: `research/changping_report.md`, `research/methodology.md`, `research/source_audit.md`, `research/excel_review.md`
- Generate: `data/processed/{positions,competition,cutoffs,sources,study_plan}.json`, `public/data/app-data.json`, `research/data_quality_report.md`

**Interfaces:**
- Produces: `extract_study_plan(workbook_path: Path) -> StudyPlanInput`，以只读方式读取全部 8 张工作表和业务数据区；不读公式缓存作为实际成绩。
- Produces: `validate_inputs(positions, observations, sources) -> list[QualityIssue]`；检查主键、年份、招录数、URL/来源、竞争比、分数区间、外键、来源冲突、空值/零值；阻断错误令构建失败，需复核项写入质量报告。
- Produces: `build_dataset(workbook_path, input_dir, processed_dir, frontend_path) -> AppDataset`；同时写分表和稳定 ID 前端 JSON，不打开任何原始工作簿写模式。
- Produces: `analyze_positions(dataset: AppDataset) -> Findings`，按年度及区直/街道/镇、专业、招录人数、明确资格限制分组；对每项说明分子/分母、样本数和来源覆盖，不足以比较时返回不可用而非排序。

- [ ] **Step 1: 检查官方职位表与开发/Excel环境**：检索北京市公务员招考目录及 2024–2026 公告的正式职位简章附件，确认本机 Python/openpyxl、Node/npm 和附件格式读取能力；优先保存官方原始附件，2022–2023 只在能找到同等可追溯来源时纳入。
- [ ] **Step 2: 先整理字段/指标合同和 ETL 失败测试**：覆盖全量工作簿 8 表及计划题量/时长、Review Focus 中空值/显式零、年度+代码重复、来源缺失、registered 与 qualified 比例区分、合格线与岗位最低进面分隔离、报名数低于招录数为复核警告而非自动删除、来源冲突留存、职位/观察与证据外键、区直/街道/镇映射未知时不臆分。
- [ ] **Step 3: 运行 Python 标准库测试确认失败**：`python3 -m unittest discover -s scripts/etl/tests -v`；预期因 ETL/质量接口尚不存在而失败。
- [ ] **Step 4: 复制工作簿并实现 ETL/校验器**：复制原文件到 `data/raw/`，用 openpyxl 只读解析；保留职位原始文本与所列招录限制字段，支持官方表及可追溯二手行；分别导出位置、报名/竞争、笔试合格线/岗位进面分/最终成绩、来源证据和50天学习计划；不修改工作区原文件。
- [ ] **Step 5: 完成 2024–2026 职位收集与代码级交叉核对**：按年度逐岗核对官方表与镜像，记录差异行、职位数/计划人数复算、实际单位类别；搜索可用的官方报名、资格复审/面试及成绩公告，并补充可直接追溯的第三方数据；职位级缺失保持 null，区级统计不分摊。2023/2022 作有证据时的增量。
- [ ] **Step 6: 用实际数据运行分组分析并写报告**：回答用户原任务 8 个选岗问题及 125/130/135/138/140/145 分情景；按 16 个指定主题补足 `research/changping_report.md`。样本不足、非同口径或未匹配的比较明确标为不可判断。
- [ ] **Step 7: 运行 ETL/质量检查与数据分析**：执行 `python3 -m unittest discover -s scripts/etl/tests -v`、`python3 scripts/validate_data.py`、`python3 scripts/analyze_positions.py`、`./scripts/rebuild_data.sh`；预期测试通过，生成分表、前端 JSON、质量报告，阻断错误返回非零码。

### Task 3：学习工作台、统计、建议与本地个人状态

**Files:**
- Create: `src/domain/study.ts`, `src/domain/study.test.ts`, `src/domain/persistence.ts`, `src/domain/persistence.test.ts`
- Create: `src/features/dashboard/DashboardPage.tsx`
- Create: `src/features/study/StudyPlanPage.tsx`, `XingcePage.tsx`, `ShenlunPage.tsx`, `MockAnalysisPage.tsx`
- Create: `src/components/MetricCard.tsx`, `src/components/SourceBadge.tsx`, `src/components/charts/StudyCharts.tsx`
- Modify: `src/App.tsx`, `src/styles.css`

**Interfaces:**
- Produces: `summarizeMocks(records: MockRecord[]): MockSummary`；0 场均分/标准差为 `null`，少于 2 场标准差为 `null`，支持最近 3/5 场。
- Produces: `summarizeStudy(plan: StudyPlan, state: UserState, asOf: string): StudySummary`；显式完成值计算进度，漏记不默认当已完成；只在作答量大于 0 时算正确率。
- Produces: `suggestNextWeek(summary: StudySummary, asOf: string, targetScore: number): StudySuggestion[]`；按最近有效正确率和明确未完成的未来任务给出可追溯建议；若最近5套均分已达用户目标且标准差不小于“均分−目标”的安全余量，优先建议全真模考/降低波动；缺少有效记录时返回“数据不足”原因，不给固定建议。
- Produces: `readUserState(storage: Storage): UserState`、`writeUserState(storage: Storage, state: UserState): void`；键名固定为 `changping-jingkao-dashboard:v1`，只操作本地存储。

- [ ] **Step 1: 写学习统计与存储失败测试**：覆盖 0/1/2/5 场模考、实际 0 分、空白成绩、完成/漏记计划日、零作答不算正确率、模块正确率需带样本数、空记录建议说明不足、均分达到目标但标准差大于安全余量时优先降低波动、localStorage 空/损坏/往返。
- [ ] **Step 2: 运行测试确认失败**：`npm run test:run -- src/domain/study.test.ts src/domain/persistence.test.ts`；预期导出函数缺失。
- [ ] **Step 3: 实现统计与持久化纯函数**：只从有效用户记录计算；保存/删除对应用户条目，不写回生成数据或工作簿。
- [ ] **Step 4: 实现首页和学习四页**：首页显示第几天/50、今日完成度、累计题量、行测/申论掌握情况、最近模考均值/标准差、距138分目标、历史岗位关注项、三大薄弱项和有数据支持的七天建议；50天页完整保留 Day 1–50、阶段/日期/任务/计划与实际题量/小时/常识/状态，支持时间轴与阶段视图；行测页将政治理论、常识、言语、数量、判断、资料六个官方大类与“科学推理（判断推理子类）”分开呈现，并展示子模块完成度/正确率/掌握度；申论页记录用户要求的各题型/写作能力训练次数、自评与关键词覆盖；模考页显示行测/申论/总分趋势、130/135/138/140目标线、模块表现和有效最近3/5场均值/标准差。
- [ ] **Step 5: 运行测试**：`npm run test:run -- src/domain/study.test.ts src/domain/persistence.test.ts` 和 `npm run build`；预期边界测试通过、页面编译成功。

### Task 4：职位库、详情/比较、资格检查与透明排序

**Files:**
- Create: `src/domain/qualification.ts`, `qualification.test.ts`, `src/domain/ranking.ts`, `ranking.test.ts`
- Create: `src/features/jobs/JobLibraryPage.tsx`, `JobDetailPage.tsx`, `JobComparePage.tsx`, `JobAssistantPage.tsx`, `MyConditionsPage.tsx`
- Create: `src/components/JobFilters.tsx`, `src/components/PositionTable.tsx`, `src/components/EligibilityResult.tsx`, `src/components/PreferenceForm.tsx`
- Modify: `src/App.tsx`, `src/styles.css`

**Interfaces:**
- Produces: `checkEligibility(position: Position, profile: UserProfile): EligibilityResult`，状态严格限于“符合”“不符合”“待补充”“待人工核验”，逐条返回判断字段、原文和 source ID；未知/模糊信息不作为通过。
- Produces: `scoreDifficulty(position: Position, dataset: AppDataset): ScoreBreakdown | null` 与 `scoreFit(position: Position, profile: UserProfile, preferences: UserPreferences, mocks: MockRecord[], dataset: AppDataset): ScoreBreakdown | null`；只使用规格权重，公开各分项/方向/样本量，关键输入缺失或样本不足返回 `null` 而非伪精确总分。
- Produces: `comparePositions(ids: string[], positions: Position[]): Position[]`，保留请求顺序，最多返回 5 个有效职位。

- [ ] **Step 1: 写职位逻辑失败测试**：覆盖公共管理原文/1204/1252 的已知与不确定映射、缺少学历/身份字段状态、官方合格线不被当作职位进面线、无核心分项隐藏总分、分数分项来源和理由可追溯、最多比较 5 个。
- [ ] **Step 2: 运行测试确认失败**：`npm run test:run -- src/domain/qualification.test.ts src/domain/ranking.test.ts`；预期实现缺失。
- [ ] **Step 3: 实现资格、职位比较及加权分项函数**：跨年只在可比组内使用年度记录；用于年度百分位的职位样本至少 `n=5`，采用同分平均秩并以 `(平均秩−1)/(n−1)×100` 映射到 0–100（同值样本映射为 50）。Difficulty 按规格权重依次计算：职位最低进面线百分位（高线更难，30%）、资格审核通过竞争比百分位（高比更难，25%）、招录数反向百分位（名额少更难，15%）、明确“不限”资格字段数的百分位（限制越宽越难，15%）、同可比组跨年进面线标准差百分位（波动越大难度风险越高，10%；至少两个年度，低波动代表更稳定）、来源置信度（参与字段来源等级的去重算术均值；官方100/二手70/估算40，5%）。Fit 按规格权重计算：职位竞争比反向百分位（30%）、最近5场有效模考均分减可比进面线的安全垫百分位（25%；必须满5场才能计入总分，较少时只展示差值与场次数）、招录数百分位（15%）、来源直接支持的个人限制匹配优势（10%；无可验证匹配分布即缺失）、用户明确选择的岗位类型偏好（10%）和地点偏好（5%；命中100、不命中0、未设为缺失）、来源置信度（官方100/二手70/估算40，5%）。任何加权分项缺失或样本不足时隐藏综合分，不重标化剩余权重；仍展示有证据的分项、方向、分母和缺项原因。
- [ ] **Step 4: 实现我的条件、职位库、详情、比较和助手页面**：个人配置页让用户录入最高学历、学历类型、专业名称/代码、学位、毕业年/应届、北京户籍/生源、政治面貌、基层经历、退役身份、资格证，以及执法/体测/街道/镇/区直偏好；仅专业“公共管理”预填。职位库按年度、区直/街道/镇、单位/街镇、职位类型、专业/学历、招录数、应届/党员/户籍/经历、体测、竞争比、最低进面分筛选搜索排序；详情展示条件原文、历年同单位/同组记录、报名快照/进面分与来源；最多比较5岗；助手先硬筛再显示透明软排序与理由，拒绝把待核岗位混作符合；收藏/比较状态存入 localStorage。
- [ ] **Step 5: 运行测试**：`npm run test:run -- src/domain/qualification.test.ts src/domain/ranking.test.ts` 和 `npm run build`；预期通过。

### Task 5：分数情景、昌平竞争矩阵、来源浏览与完整导航

**Files:**
- Create: `src/domain/scenario.ts`, `scenario.test.ts`
- Create: `src/features/scenarios/ScoreScenarioPage.tsx`, `CompetitionMatrixPage.tsx`
- Create: `src/features/sources/DataSourcesPage.tsx`
- Create: `src/components/AppShell.tsx`, `src/components/MobileNav.tsx`, `src/components/charts/PositionCharts.tsx`
- Modify: `src/App.tsx`, `src/styles.css`

**Interfaces:**
- Produces: `summarizeScenario(score: number, positions: Position[], observations: Observation[], filters: JobFilters): ScenarioSummary`；只计入当前筛选范围、年度匹配且被标记可比的岗位级 `interview_min_score` 样本，并返回低于/接近/高于计数及分母。
- Produces: `buildCompetitionMatrix(positions: Position[], observations: Observation[]): MatrixRow[]`；按实际记录的区直/街道/镇和单位汇总岗位数、招录数、竞争观察及分数样本，保留未知类，不补行政区划单位。

- [ ] **Step 1: 写情景与矩阵失败测试**：覆盖 120–150 分边界、低于为低于 cutoff−2.5、接近为与 cutoff 相差不超过 2.5、高于为高于 cutoff+2.5、筛选分母、无职位级分数时样本数为 0/无分类、区级观察不得下放到单岗位、未知类别保留。
- [ ] **Step 2: 运行测试确认失败**：`npm run test:run -- src/domain/scenario.test.ts`；预期导出缺失。
- [ ] **Step 3: 实现情景及矩阵纯函数**：分值滑块范围 120–150、步长 1；“接近”按距历史可比最低进面分不超过 2.5 分定义并在页面说明；任何情景都显示当前筛选样本 `n`，不显示概率。
- [ ] **Step 4: 实现情景、矩阵、来源页面和主导航**：预置 125/130/135/138/140/145 分场景，滑块范围 120–150；按所选年度/类别及样本覆盖列出低于/接近/高于历史可比岗位最低进面分的职位数与清单；如至少5套有效模考且 cutoff 可信，安全垫用最近5场均分减历史可比 cutoff，波动档位按 `安全垫` 与模考标准差比较，场次少则只显示差值及 n 不分档。竞争矩阵使用表格/热力图而非无可靠行政边界的地图；来源页按岗位/字段/年度/等级检索 URL、日期、原值、口径、冲突及核验状态；标注“截至 2026-10-07：官方目录未检出普通2027职位表”。
- [ ] **Step 5: 运行测试**：`npm run test:run -- src/domain/scenario.test.ts` 和 `npm run build`；预期通过并构建成功。

### Task 6：本地启动、用户文档、端到端验收与摘要

**Files:**
- Create: `start.sh`, `README.md`, `FINAL_SUMMARY.md`
- Modify: `package.json`（`dev`、`build`、`test:run` scripts）

**Interfaces:**
- Produces: `start.sh` 从项目根目录启动 Vite 本地开发服务器；不自动安装依赖、不访问远程服务。
- Produces: `README.md` 说明 Python/npm 要求、`npm install`、数据重建、启动/构建命令、localStorage 使用和数据来源边界。
- Produces: `FINAL_SUMMARY.md` 链接研究报告，并据实际结果汇总逐年职位覆盖、竞争/进面数据覆盖、数据缺口、5个关键结论、125–145分层、最值得关注的岗位类型、运行/更新命令和浏览器验收。

- [ ] **Step 1: 运行全套自动检查**：`python3 -m unittest discover -s scripts/etl/tests -v`、`python3 scripts/validate_data.py`、`npm run test:run`、`npm run build`；预期 Python/Vitest 测试和生产构建均返回成功，质量报告列出真实职位覆盖和字段缺失率。依赖只在 Task 1 安装一次。
- [ ] **Step 2: 启动并检查桌面与移动布局**：运行 `./start.sh`，用浏览器在 1440×900 与 390×844 检查首页、50天计划、行测、申论、模考、个人条件、职位筛选/排序、详情、比较、资格结果、分数模拟、竞争矩阵和来源页；验证输入重载仍保存在本机，样本 n/口径/来源冲突可见，表格可横向浏览、中文正常、无控制台异常和错误资源。
- [ ] **Step 3: 修复验收中可复现的问题并重跑对应检查**；将实际逐年覆盖、研究结论、命令输出和浏览器核验状态写入 `FINAL_SUMMARY.md`，不记录未执行的检查为通过。

## 计划自审

- **规格覆盖：** ETL 与 2024–2026（可得则 2022–2023）职位研究、数据质量和 16 主题研究报告在 Task 2；首页及学习四页在 Task 3；个人条件、职位筛选、比较、资格与评分在 Task 4；125/130/135/138/140/145 情景、矩阵、来源与 2027 状态在 Task 5；启动、构建、12 页桌面/移动验收和最终摘要在 Task 6。
- **步骤粒度：** 每项按失败测试、确认失败、最小实现、独立验证组织；任务交付物可在下一个任务开始前审阅。
- **类型一致性：** Task 1 定义 `AppDataset` 与主记录类型；后续纯函数、加载器和页面都消费该合同。ETL以相同字段输出 JSON。
- **Review Focus：** 五类高风险输入分别绑定 Task 2、Task 3、Task 4 和 Task 5 的明确测试；Task 6 浏览器检查跨页和本地持久化。
- **比例：** 一个计划涵盖相互依赖的单一本地应用和其源数据研究。不能以现有5条候选职位替代全量采集；可取得数据必须尽力纳入，缺数据时只缩小受影响分析结论，不缩小项目交付范围或伪造数字。
