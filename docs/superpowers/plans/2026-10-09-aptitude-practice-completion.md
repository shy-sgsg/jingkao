# 行测练习与模考闭环实施计划

> **For agentic workers:** Use `superpowers:executing-plans` inline; each behavior follows test-first RED → GREEN.

**Goal:** 七个行测模块都能从行测主页直接开始自由刷题或限时模考，并在模考记录页复盘已完成的站内模块模考。

**Architecture:** 沿用现有科学推理、常识判断专用会话与五模块通用会话。给其余五模块接入自编、已解析的题目；主页按模块提供两种启动入口；模考页将站内模块场次作为独立记录列出，不混入真实整套总分统计。

**Tech Stack:** 原生 JavaScript ES modules、Node 内置测试、现有静态 Pages 构建。

**Spec:** `docs/superpowers/specs/2026-10-09-aptitude-module-architecture.md` plus the user’s latest acceptance criteria.

## Global Constraints

- 科学推理、常识判断沿用各自学习档案和会话。
- 其余模块讲解内容可为空，但必须有已发布题目和有效的自由练习/限时模考入口。
- 题库索引中的摘要、缺图题和未核答案不得冒充可练习真题。
- 站内模块模考可从模考记录进入复盘，不能冒充含申论成绩的整套真实模考。
- 保留工作区内与本次无关的用户修改和敏感文件，不加入发布提交。

## Tasks

### Task 1: 接通五个模块的练习题库

**Files:** `src/aptitude/modules.js`, `src/aptitude/questions.js`, new `src/aptitude/questionBank.js`, `scripts/build.mjs`, `test/aptitude-questions.test.js`, `test/aptitude-sessions.test.js`.

- [ ] 写测试并确认五模块题库及实会话启动失败。
- [ ] 接入每个模块的原创/重述题目与来源标记。
- [ ] 通过题库过滤和每模块会话测试。

### Task 2: 行测主页直接开练并在模考页显示站内场次

**Files:** new `src/aptitude/launch.js`, `src/aptitude/analytics.js`, `src/app.js`, `src/styles.css`, new `test/aptitude-mock-records.test.js`, `test/aptitude-pages.test.js`, `scripts/build.mjs`.

- [ ] 写失败测试并确认当前缺少跨会话库的站内模考记录聚合。
- [ ] 七模块卡片提供自由练习和限时模拟入口。
- [ ] 模考页汇总七模块已交卷/到时场次，并能链接到原结果。
- [ ] 通过目标测试并在浏览器检查实际入口和结果链接。

### Task 3: 补强常识题库并发布

**Files:** `src/general-knowledge/questionBank.js`, `src/general-knowledge/lessonContent.js`, relevant data tests.

- [ ] 补充常识判断可发布的原创练习和覆盖薄弱的讲解。
- [ ] 跑目标回归、构建和发布工作流。
- [ ] 只提交本次功能、题库和内容文件，保留用户已有未提交修改。
