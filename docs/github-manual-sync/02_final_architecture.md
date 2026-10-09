# 最终架构

网站继续以静态单页应用运行，不增加后端、数据库或运行时依赖。

```text
当前设备浏览器
  ├─ 固定密码前端入口
  ├─ 本地加密学习档案（localStorage）＋自动保存
  ├─ GitHub Token（IndexedDB 中用设备 AES-GCM 密钥加密）
  └─ 用户手动启动同步 → GitHub REST API
                              └─ shy-sgsg/jingkao / sync-data / user-data/backup.json
```

固定密码只控制页面交互，不证明用户身份，也不保护公开源码或公开仓库。个人备份采用可读 JSON。同步只由同步面板中的用户操作触发：先读、校验、合并预览；用户选完冲突并再次确认后才可能写入。

代码职责：

- `src/app.js`：访问门、本地档案、同步面板和确认流程。
- `src/data/sync.js`：版本化备份、数据投影、稳定编号、三方合并和删除标记。
- `src/data/github.js`：GitHub Contents 与 Git References API、SHA 乐观并发、写后回读校验。
- `src/data/githubTokenStore.js`：设备本地 Token 加密存取；缺少持久化能力时使用当前页面内存。
- `scripts/build.mjs`：把新增模块编入独立静态构建产物。

分支首次创建只会在用户确认写入时发生，并从默认分支 `main` 创建。同步分支不参与 Pages 发布。
