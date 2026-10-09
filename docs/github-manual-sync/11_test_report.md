# 测试报告

报告来自本次工作区运行。测试针对模拟 GitHub API，不使用真实 Token 或真实仓库写入。

| 检查 | 状态 | 结果 |
|---|---|---|
| `node --test test/account-ui.test.js` | PASS | 13/13；固定密码、旧数据不迁移、答题与限时模拟自动保存并在重载后恢复、双设备同步、备份和同步确认。 |
| `node --test test/settings-plan.test.js` | PASS | 11/11；计划编辑加密保存、重载恢复且不覆盖实际进度。 |
| `node --test test/sync.test.js` | PASS | 9/9；版本化 schema、稳定编号、筛选偏好、三方合并、冲突、删除标记和远端记录顺序。 |
| `node test/github.test.js` | PASS | 6/6；模拟 Contents/Refs API、权限/并发错误与写后校验。 |
| `node test/github-token-store.test.js` | PASS | 3/3；设备加密存取与内存回退。 |
| 双设备模拟流程 | PASS | 两份隔离本机状态经模拟 API 首次写入、另一设备拉取并新增 5 条常识答题后回同步，首设备再拉取；双方保留 10 条科学推理和 5 条常识答题且没有重复。 |
| `npm run build` | PASS | 生成独立的 `dist/index.html`，无外部运行时依赖。 |
| `npm test` | PASS | 最新 `origin/main` 合并后的 72/72 个测试文件通过。 |
| 图形浏览器与手机实机复核 | NOT_TESTED | 当前会话没有可用浏览器表面，无法进行截图或触控尺寸复核。 |
| 真实 GitHub 分支创建与备份上传 | NOT_TESTED | 按要求只用模拟 API；没有真实 Token，也没有创建远端分支或上传学习记录。 |

合并到最新主分支后，`test/build-site.test.js` 的手动行测记录夹具改为使用与应用相同的稳定内容键；完整现有测试套件现为全绿。真实 GitHub 分支创建与备份写入仍使用模拟 API 验证，没有对用户仓库执行写入。
