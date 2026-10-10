# 京考科学推理学习与计划联动系统实施计划

> **For agentic workers:** 按任务逐项实施并验证。开发功能时先写失败测试，再写最小实现。最终执行整套 JavaScript 测试、静态构建和浏览器验收。

**Goal:** 在现有京考静态网站中加入可编辑的科学推理任务、知识学习、练习/限时模拟、真实记录、错题复习和计划联动。

**Architecture:** 保留 GitHub Pages、原生 JavaScript 和现有本地加密档案。公开知识树与题目作为静态内容；用户任务、答题事件、考试会话和统计保存在当前档案中。计划任务使用结构化类型与稳定 ID，启动的学习会话只归属于一个任务。

**Tech Stack:** HTML、CSS、JavaScript ES modules、Node 内置测试运行器、Web Crypto、本地加密档案。

**Spec:** `/home/shy/.codex/attachments/45bc7c7e-75a5-4333-9ea3-f9cc4a44d71c/pasted-text-1.txt`；项目适配事实见 `docs/science-reasoning/01_project_audit.md`。

## Global Constraints

- 保留原有选岗、学习计划、模考和个人档案数据。
- 不读取、迁移或重新应用旧 50 天复习计划 Excel。
- 不增加服务器、数据库或第三方运行时依赖。
- 科学推理只在用户显式选择该任务类型时联动。
- 自定义任务不得通过标题文本匹配科学推理。
- 练习、正式模拟和手动完成状态分开统计。
- 不将机构回忆题或大纲例题冒充官方真题；未核实内容不得发布为真题。
- 计划修改、删除或题库更新不删除真实学习历史。

## Review Focus

1. 旧档案或旧备份缺少新增字段时，仍可读取并保存原数据。
2. 名称为“科学推理”的自定义任务不触发科学模块。
3. 同一天多个任务、重复提交和重复交卷不会重复计入进度或成绩。
4. 北京时区跨日、跨月及过期任务仍按任务日期归属，过期任务不会自动完成。
5. 被停用的知识点保留历史标题与记录，并提供重新选择路径。

---

### Task 1: 稳定现有自动化测试入口

**Files:**
- Modify: `package.json`
- Test: `test/build-site.test.js`, `test/account-ui.test.js`, `test/settings-plan.test.js`

**Interfaces:** 当前各测试文件调用 `scripts/build.mjs` 并共用 `dist/`。

- [ ] 修改前后分别记录 `npm test` 与单线程测试结果。
- [ ] 将 `test` 和 `test:run` 脚本设置为 `node --test --test-concurrency=1 test/*.test.js`。
- [ ] 运行 `npm test`，确认基线测试不再竞争共享构建目录。

### Task 2: 添加并验证科学推理领域数据

**Files:**
- Create: `src/science/knowledge.js`
- Create: `src/science/questions.js`
- Create: `src/science/validation.js`
- Modify: `scripts/build.mjs`
- Test: `test/science-data.test.js`

**Interfaces:** `getScienceTree()`、`getKnowledgePoint(id)`、`filterQuestions(filters)`、`validateQuestionBank(bank)`。

- [ ] 测试四学科树、稳定 ID、题目引用有效知识点及字段/来源校验。
- [ ] 运行目标测试并确认其因模块/函数缺失而失败。
- [ ] 添加最小数据模型，并把新模块加入静态构建清单。
- [ ] 运行目标测试和完整 JavaScript 套件。

### Task 3: 扩展加密档案与备份兼容

**Files:**
- Modify: `src/app.js`
- Modify: `src/data/backup.js`
- Test: `test/backup.test.js`
- Test: `test/science-persistence.test.js`

**Interfaces:** 档案新增 `studyPlanTasks`、`scienceProgress`、`scienceSessions`、`scienceAnswers`、`scienceMistakes` 字段；缺失字段默认空集合。

- [ ] 测试旧档案读写保留旧字段、新记录加密持久化、旧/新 JSON 备份校验和无效备份不改档案。
- [ ] 运行目标测试确认缺失行为。
- [ ] 扩展 `emptyStorage`、`readStorage` 和备份解析/验证。
- [ ] 运行目标测试与完整 JavaScript 套件。

### Task 4: 构建可编辑计划任务模型

**Files:**
- Create: `src/science/planTasks.js`
- Modify: `src/app.js`
- Test: `test/science-plan-tasks.test.js`

**Interfaces:** `createPlanTask(input, now)`、`updatePlanTask(tasks, id, input)`、`archivePlanTask(tasks, id)`、`getTasksForDate(tasks, date)`。

- [ ] 测试任务类型、字段校验、稳定 ID、日期筛选、归档及旧日计划数据不变。
- [ ] 实现纯任务模型并接入档案。
- [ ] 运行目标测试和回归测试。

### Task 5: 为计划任务增加编辑界面与提醒

**Files:**
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Test: `test/settings-plan.test.js`
- Test: `test/science-plan-ui.test.js`

**Interfaces:** `plan` 页面提供新增/编辑/删除任务；类型字段保留普通分类、科学推理和自定义任务。

- [ ] 测试普通、自定义及科学推理表单切换、保存、标题预览和手动完成来源。
- [ ] 测试首页、计划页在当天有/无科学推理任务时的提醒。
- [ ] 实现任务表单、轻量提醒及旧 50 天计划的并存呈现。
- [ ] 运行目标测试和完整 JavaScript 套件。

### Task 6: 建立科学推理学习内容页

**Files:**
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Create: `public/science/` 下必要的 SVG 图示
- Test: `test/science-pages.test.js`

**Interfaces:** 哈希路由增加科学推理首页、知识点页、题库页、错题页、统计页和来源页；目录和表单共享 `getScienceTree()`。

- [ ] 测试路由存在、知识点 ID 解析、不可用知识点提示及配套练习入口。
- [ ] 添加知识阅读、例题、进度标记和移动端布局。
- [ ] 在首页及导航加入入口，保证可独立使用。
- [ ] 运行目标测试与静态构建。

### Task 7: 实现练习模式与答题记录

**Files:**
- Create: `src/science/sessions.js`
- Modify: `src/app.js`
- Test: `test/science-sessions.test.js`

**Interfaces:** `startPracticeSession(options)`、`submitPracticeAnswer(session, questionId, answer)`、`getPracticeStats(events)`。

- [ ] 测试不限时、单题解析、重复提交、不同题目计数、刷新恢复和练习统计。
- [ ] 实现有效作答事件、错题收集、收藏和继续练习。
- [ ] 运行目标测试和完整 JavaScript 套件。

### Task 8: 实现正式限时模拟

**Files:**
- Modify: `src/science/sessions.js`
- Modify: `src/app.js`
- Test: `test/science-exam.test.js`

**Interfaces:** `startExamSession(options, now)`、`getExamRemainingSeconds(session, now)`、`submitExam(session, answers, now)`。

- [ ] 测试截止时间恢复、刷新不重置、答案修改、跳题、提前交卷、自动交卷和重复交卷幂等。
- [ ] 测试得分率与已答题准确率定义及练习/正式隔离。
- [ ] 实现考试页、答题卡和成绩报告。
- [ ] 运行目标测试与完整 JavaScript 套件。

### Task 9: 实现错题、学习统计与建议

**Files:**
- Create: `src/science/analytics.js`
- Modify: `src/app.js`
- Test: `test/science-analytics.test.js`

**Interfaces:** `getMistakes(records, filters)`、`getSubjectStats(records, subjectId)`、`getStudyRecommendations(records)`。

- [ ] 测试错因可选、答对后保留历史、数据不足不诊断、练习和考试分别统计。
- [ ] 实现错题重练、掌握标记、趋势、薄弱项和加入计划预填表单。
- [ ] 运行目标测试及完整 JavaScript 套件。

### Task 10: 完成计划到学习的双向同步

**Files:**
- Modify: `src/science/planTasks.js`
- Modify: `src/science/sessions.js`
- Modify: `src/app.js`
- Test: `test/science-plan-integration.test.js`

**Interfaces:** 会话含单一 `planTaskId`；`getPlanTaskProgress(task, sessions, answers)` 从有效记录计算进度。

- [ ] 测试 8/15 后继续到 15/15、目标变更、任务改期、改型、删除、手动完成和同日多任务。
- [ ] 测试相同题目重复提交只增加一次不同题目进度。
- [ ] 测试知识点完成需用户确认，限时考试只有有效交卷才完成，空白考试不完成。
- [ ] 实现稳定路由参数和开始前模式确认。
- [ ] 运行目标测试与完整 JavaScript 套件。

### Task 11: 建设来源目录、知识内容和题库

**Files:**
- Modify: `src/science/knowledge.js`
- Modify: `src/science/questions.js`
- Create: `docs/science-reasoning/02_exam_research.md`
- Create: `docs/science-reasoning/03_source_catalog.md`
- Create: `docs/science-reasoning/04_question_collection_audit.md`
- Create: `docs/science-reasoning/05_knowledge_system.md`
- Create: `docs/science-reasoning/10_question_quality_report.md`
- Test: `test/science-data.test.js`

**Interfaces:** 已发布题目记录来源类别、核验状态、版权状态、知识点和答案解析；目录收录完整四学科樹。

- [ ] 为每题核对题干完整性、唯一答案、解析、知识点和来源标记。
- [ ] 只把可核实且可展示的题目标为真题；其他条目作来源目录或原创题。
- [ ] 建立覆盖四学科的知识讲解与例题，重要原理配准确 SVG。
- [ ] 数据校验报告统计已发布题、真题、原创题、缺项和知识点覆盖。
- [ ] 运行题库数据测试；人工复核计算和图示。

### Task 12: 完成 UI、备份、使用手册与验收

**Files:**
- Modify: `src/styles.css`
- Modify: `src/app.js`
- Modify: `src/data/backup.js`
- Create: `docs/science-reasoning/06_data_model.md` through `13_final_acceptance.md`
- Create: `docs/science-reasoning/screenshots/`
- Test: `test/science-pages.test.js`, `test/science-persistence.test.js`

**Interfaces:** 页面使用普通用户文案；备份包含新个人数据；最终验收逐项给出 `PASS`、`FAIL`、`PARTIAL` 或 `NOT_TESTED`。

- [ ] 测试任务、错题和完整个人学习数据的导出/恢复。
- [ ] 完成用户手册，配从实际网站获取的页面截图。
- [ ] 在桌面和手机宽度检查计划、讲解、答题、考试、错题和统计页面。
- [ ] 运行 `npm test`、`npm run build`；运行不访问旧 Excel 的数据校验。
- [ ] 浏览器走通计划—学习—记录—进度链路，并回归首页、岗位、选岗和旧计划。
- [ ] 按证据填写最终验收报告，再提交并推送。
