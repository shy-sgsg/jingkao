# GitHub 授权设置

同步目标固定为公开仓库 `shy-sgsg/jingkao`，数据分支 `sync-data`，文件 `user-data/backup.json`。客户端 API 版本头为 `2026-03-10`。

创建 fine-grained personal access token 时：

1. 只选择 `shy-sgsg/jingkao` 这个仓库，并按需要设置过期时间。
2. 只授予仓库权限 `Contents: Read and write`。
3. 在网站“云端同步 → 同步设置”粘贴并保存 Token。

公开备份读取可以不带 Token；分支创建和文件写入需要 Token。Token 不进入 `localStorage`、个人备份、构建产物或 URL。支持 IndexedDB 与 Web Crypto 的浏览器会使用不可导出的 AES-GCM 设备密钥加密保存。否则 Token 暂存在内存中，刷新页面后重新输入。

实现参考 GitHub 官方文档：[API 版本](https://docs.github.com/en/rest/about-the-rest-api/api-versions?apiVersion=2026-03-10)、[Contents API](https://docs.github.com/en/rest/repos/contents)、[Git References API](https://docs.github.com/en/rest/git/refs)。本次没有用真实 Token 调用 API。
