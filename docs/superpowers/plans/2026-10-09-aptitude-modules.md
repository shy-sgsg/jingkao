# 行测模块统一架构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让七个行测板块共享模块注册、学习入口、计划联动和题库接口，同时保持科学推理与常识判断现有档案数据不变。

**Architecture:** 新增行测模块注册表和发布题库读取接口；用模块适配器连接现有科学推理、常识判断和新建的五个空题库模块。新增模块的会话和学习状态按模块隔离，计划配置及页面入口由注册信息生成。

**Tech Stack:** 原生 JavaScript ES modules、Node 内置测试运行器、现有本地加密用户档案和静态构建脚本。

**Spec:** `docs/superpowers/specs/2026-10-09-aptitude-module-architecture.md`

## Global Constraints

- 七个稳定模块为政治理论、常识判断、言语、数量关系、判断推理、科学推理、资料分析。
- 科学推理和常识判断继续使用 `scienceStudy` 与 `generalKnowledgeStudy`；既有链接和学习历史可读取。
- 本次不新增、不搜索题目，也不编写新的知识讲解；其余五模块题库与知识内容为空。
- 题库为空时不能创建空会话或伪造学习完成记录。
- 用户状态、题目答案、错题、收藏和计划进度按模块隔离；旧备份仍可读取。
- 不增加服务端或第三方运行时依赖，不改变申论、岗位决策或全站模考流程。

## Review Focus

- 空题库仍创建会话：断言启动被拒绝，档案中的会话列表不变。
- 同题 ID 出现在两个模块：断言答案、错题、收藏和统计只归属各自模块。
- 旧档案或旧备份缺少新模块状态：断言恢复为空状态且保留科学推理、常识判断历史。
- 计划任务更换模块或编辑配置：断言不继承其他模块进度，任务历史仍保留。
- 旧版 science / general-knowledge 链接和现存手动记录：断言仍落到原模块和原训练记录。

---

### Task 1: 建立模块注册表、题库接口并纳入现有常识模块依赖

**Files:**
- Create: `src/aptitude/modules.js`
- Create: `src/aptitude/questions.js`
- Create: `src/general-knowledge/` module files already imported by the current app
- Modify: `src/data/backup.js`
- Modify: `src/science/persistence.js`
- Modify: `src/science/planTasks.js`
- Modify: `src/science/sessions.js`
- Modify: `src/app.js`
- Modify: `scripts/build.mjs`
- Test: `test/aptitude-module-registry.test.js`
- Test: `test/aptitude-questions.test.js`
- Test: `test/general-knowledge-*.test.js`
- Modify: `test/science-persistence.test.js`

**Interfaces:**
- `APTITUDE_MODULES`: 七项注册信息，包含稳定 `id`、`area`、`symbol`、`hint`、`route`、`taskType`、旧训练记录 `recordArea` 和旧模考分项 `mockKey`/`mockLabel`。
- `getAptitudeModule(id) -> module | null`。
- `getAptitudeMockModules() -> [[id, label]]`：从注册项派生并按 `mockKey` 去重，保持当前模考页面使用的 `[key, label]` 元组，政治理论与常识判断继续共用旧模考分项。
- `getAptitudeQuestions(moduleId, filters = {}) -> publishedQuestion[]`；已注册但未接题库的模块返回 `[]`，未注册 ID 抛错。
- 科学推理与常识判断通过现有题库提供器返回数据；其他五项显式注册为空提供器。

- [x] 写测试：注册表恰有七项，module/task/route/record 映射唯一且政治理论为独立模块；模考映射仍把政治理论与常识合并。
- [x] 运行注册表测试，确认在模块注册表不存在时失败。
- [x] 写测试：两套现有题库仍可读取，其他五项返回空列表，过滤后不包含未发布题。
- [x] 运行题库测试，确认在题库读取接口不存在时失败。
- [x] 实现纯数据注册表与题库 provider；从 `src/app.js` 移除重复的 `APTITUDE_MODULES` 定义并导入注册表。
- [x] 将新增源文件列入 `scripts/build.mjs`，运行两个目标测试与 `npm run build`。
- [x] 运行注册表、题库、常识模块和持久化目标测试及 `npm run build`；仅提交本任务文件，提交信息 `feat: establish aptitude module foundation`。

### Task 2: 添加隔离的模块学习状态与通用会话适配器

**Files:**
- Create: `src/aptitude/persistence.js`
- Create: `src/aptitude/sessions.js`
- Modify: `src/aptitude/modules.js`
- Modify: `src/science/persistence.js`
- Modify: `src/data/backup.js`
- Modify: `src/app.js`
- Modify: `scripts/build.mjs`
- Test: `test/aptitude-persistence.test.js`
- Test: `test/aptitude-sessions.test.js`
- Modify: `test/aptitude-module-registry.test.js`
- Modify: `test/backup.test.js`
- Modify: `test/science-persistence.test.js`

**Interfaces:**
- `emptyAptitudeModuleStudy(moduleId) -> studyState`。
- `normalizeAptitudeModuleStudies(value) -> moduleIdToStudyState`，仅含政治理论、言语、数量关系、判断推理、资料分析五个新模块。
- `setAptitudeModulePointStatus(studies, moduleId, pointId, status, at) -> moduleIdToStudyState`。
- `toggleAptitudeModulePointFlag(studies, moduleId, pointId, flag) -> moduleIdToStudyState`，知识点标记支持 `favorite` 和 `unclear`。
- `toggleAptitudeModuleFavorite(studies, moduleId, questionId) -> moduleIdToStudyState`。
- `createAptitudeModuleSession(bank, studies, moduleId, options, metadata) -> { aptitudeModuleStudies, session }`。
- `answerAptitudeModuleQuestion(bank, studies, moduleId, sessionId, optionId, options) -> aptitudeModuleStudies`。
- `continueAptitudeModuleSession(bank, studies, moduleId, sessionId, options) -> aptitudeModuleStudies`。
- `selectAptitudeModuleAnswer(bank, studies, moduleId, sessionId, optionId, options) -> aptitudeModuleStudies`。
- `goToAptitudeModuleQuestion(studies, moduleId, sessionId, index) -> aptitudeModuleStudies`。
- `finishAptitudeModuleSession(bank, studies, moduleId, sessionId, options) -> aptitudeModuleStudies`。
- 通用会话沿用练习/限时模拟的幂等、截止时间及结果规则，并在会话和答案中写入模块 ID。

- [x] 写测试：新状态字段缺失、损坏或错误模块键时规范化为空；有效模块数据原样保留。
- [x] 写测试：模块讲解状态及知识点/题目收藏写入只改指定模块，非法模块或状态被拒绝。
- [x] 运行目标测试，确认目前 `normalizeStudyState` 未处理新模块字段。
- [x] 写备份测试：旧格式备份接受新字段缺失；新格式导入导出保留五模块状态，并保留原有 science/GK 状态。
- [x] 实现新模块状态初始化和 `normalizeStudyState` 接入，默认不搬移或改写旧模块字段。
- [x] 写会话测试：合成测试题可创建、作答、交卷；答案、错题、收藏标记带正确 moduleId。
- [x] 写会话生命周期测试：练习反馈后继续、模拟改选/跳题/统一交卷、到期交卷、重复交卷均符合现有规则。
- [x] 写边界测试：无已发布题或跨模块题目 ID 时拒绝创建/作答，源模块状态不变；重复交卷不重复记录。
- [x] 实现通用会话适配器，复用当前已验证的会话规则并保留每个模块自己的状态对象。
- [x] 运行状态、会话、备份和科学推理持久化测试，提交本任务文件。

### Task 3: 支持所有行测板块的计划配置与进度核验

**Files:**
- Create: `src/aptitude/planTasks.js`
- Modify: `src/science/planTasks.js`
- Modify: `src/app.js`
- Modify: `scripts/build.mjs`
- Test: `test/aptitude-plan-tasks.test.js`
- Modify: `test/science-plan-tasks.test.js`
- Modify: `test/general-knowledge-plan-tasks.test.js`

**Interfaces:**
- `normalizeAptitudeConfig(moduleId, config) -> normalizedConfig`：支持 `knowledge`、`practice`、`exam`、`mistakes`、`free`，并校验题量、时长、目录筛选字段和来源/难度枚举。
- `getAptitudeModuleTaskProgress(task, sessions, answers) -> progress`：仅汇总同模块、同任务、同筛选的有效记录并按不同题目 ID 去重。
- 五个新板块使用 `aptitudeConfig: { moduleId, ... }`；科学推理、常识判断字段保持原样。

- [x] 写测试：`political_theory` 及其他四类新任务可创建、编辑；自由任务和非法配置按契约处理。
- [x] 运行目标测试，确认计划模型拒绝 `political_theory` 或无法识别其训练配置。
- [x] 写进度测试：筛选不匹配、跨模块答案、重复题、未交卷考试不满足目标；有效不同题目满足目标后可核验完成。
- [x] 实现模块配置规范化、类型/模块映射、进度汇总和配置变更时的进度重算。
- [x] 回归 science/GK 原配置、手动完成来源、更新任务 ID/创建时间保持不变。
- [x] 运行三个计划模型测试文件并提交本任务文件。

### Task 4: 统一行测页面入口并接通空题库模块

**Files:**
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Create: `test/aptitude-pages.test.js`
- Modify: `test/science-pages.test.js`
- Modify: `test/general-knowledge-pages.test.js`
- Modify: `test/page-help.test.js`
- Modify: `scripts/build.mjs`

**Interfaces:**
- 所有模块入口、总览卡片、模考筛选和学习计划选项由 `APTITUDE_MODULES` 生成。
- 新路由 `#/aptitude/<module-id>`；现有 `#/aptitude/science`、`#/aptitude/general-knowledge` 与 `#/aptitude/module/<module-id>` 继续有效。
- 新模块共享概览/学习/练习/错题/统计/手动记录/计划区块；目录、讲解和题库均由 provider 供数。空 provider 显示待接入状态，练习和模拟入口不可启动。

- [x] 写路由与页面测试：七个模块可从总览到达，旧路由仍解析到正确板块，未知 ID 返回空状态。
- [x] 写空状态测试：五个空题库模块展示题库待接入，空库会话适配器拒绝创建，训练入口禁用。
- [x] 写总览测试：模块卡片数值按手动记录与本模块站内记录合并，其他模块答案不能进入统计。
- [x] 写内容 provider 测试：provider 可注入测试目录和讲解；仓库发布题库仍为空。
- [x] 从总览、模考筛选、计划选择、导航和提示中移除重复模块清单，改用注册表。
- [x] 添加新模块学习页和通用练习/模拟会话交互；保持科学推理与常识判断的专用页面及旧动作正常运行。
- [x] 添加模块路由导航样式与空状态样式，运行页面/路由/帮助测试和静态构建。

### Task 5: 接通计划任务 UI、备份和完整回归

**Files:**
- Modify: `src/app.js`
- Modify: `src/data/backup.js`
- Modify: `test/settings-plan.test.js`
- Create: `test/aptitude-plan-ui.test.js`
- Modify: `test/backup.test.js`
- Modify: `test/build-site.test.js`

**Interfaces:**
- 计划编辑器按注册表列出七个模块类型；模块任务均可保存/编辑、进入正确模块页，并显示按模块隔离的目标与进度。
- 空题库任务允许配置和计划跳转，开始训练控件显示不可用原因，不自动完成。
- 档案 `aptitudeModuleStudies` 与计划记录在旧档案读取、新加密保存及 JSON 备份往返中保留。

- [x] 写计划 UI 测试：政治理论独立可选；五个新模块可保存结构化配置并从计划任务直达对应页。
- [x] 写联动测试：任务进度按模块/任务过滤；空题库不会自动完成；同题跨模块、跨任务不累计。
- [x] 写备份测试：旧用户状态往返后既有字段和个人学习历史保持不变（Task 2 备份回归已通过）。
- [x] 完成页面、状态、计划模型和备份目标测试，运行 `npm run build`；全量 `npm test` 中 67 项通过，唯一失败来自未暂存的 `test/gwyzwb-2026-yanqing.test.js` 对缺失延庆来源目录的新增断言，未改动该用户文件。
- [x] 从生成的站点脚本确认无残留 ES module import，检查实际路由/空题库状态。
- [x] 对照规格更新验收证据；待只暂存本任务文件并提交。

## Spec Coverage Self-Review

- 模块清单和唯一来源：Task 1、Task 4。
- 已发布题库接口与空库禁止会话：Task 1、Task 2、Task 4。
- 学习状态隔离、旧档案和备份兼容：Task 2、Task 5。
- 计划配置、模块直达、进度核验：Task 3、Task 5。
- 手动与站内统计汇总、旧路由兼容：Task 4。
- 测试专用合成题而不扩充发布题库：Task 2、Task 4。
- 数据内容范围不变：全局约束及 Task 4 内容 provider 测试。
