# 最终验收

验收日期：2026-10-09

| 项目 | 状态 | 证据 |
|---|---|---|
| 行测能力子模块与科学推理页面 | PASS | `src/app.js` 从行测能力页提供科学推理、常识判断子模块；分别使用 `#/aptitude/science`、`#/aptitude/general-knowledge`，并兼容旧 `#/science` 路由 |
| 计划任务与科学训练联动 | PASS | 任务卡进度、不同题目去重、续练、提高目标后重开及档案兼容测试通过 |
| 题源与答案字段校验 | NOT_RUN | `science-data.test.js` 的现有计数已更新到 259 道、86 道回忆题和 34 个来源；完整测试待 Pages 工作流执行 |
| 官方大纲、外省/跨省回忆及机构题 | PARTIAL | 6 道官方大纲例题、86 道回忆题、14 道机构例题/模拟题；可核验的官方历年真题为 0 |
| 新增原创模拟题 | PASS | 当前原创题仍为 153 道，本轮新增数量为 0 |
| 知识目录与讲解 | PARTIAL | 四科 128 个知识点，79 个有完整讲解；49 个仍是提纲 |
| 自动化回归测试 | PRIOR_PASS | 上一批全量测试 `npm test`：55/55 个测试文件通过，0 失败；本批未重跑 |
| 静态构建 | PASS | 本批 `npm run build` 退出码 0，成功生成 `dist/index.html` |
| 实际浏览器与手机页面、截图 | NOT_TESTED | 当前会话无可操作浏览器，且本机 Chrome 无法启动；没有生成截图 |
| GitHub Pages 自动部署 | TRACKED_IN_ACTIONS | [run 12](https://github.com/shy-sgsg/jingkao/actions/runs/37896031298) 在 `e160d09` 上因路由帮助清单断言失败，未执行构建；本批已补齐 `science` 与 `generalKnowledge` 两个路由 ID，后续提交的结果以各自 Actions 运行记录为准 |
| 旧 50 天计划 Excel 数据路径 | PASS | 本轮未运行旧 Excel 构建或重新生成数据 |

## 打开路径

从“备考复盘 → 行测能力”页面选择“科学推理”卡片进入，路由为 `#/aptitude/science`；旧 `#/science` 链接继续兼容。常识判断卡片进入预留空模块。本批静态构建通过；自动化测试状态如上，线上发布状态见对应的 GitHub Actions 记录。
