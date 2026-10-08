# 本地加密账户 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 支持同一浏览器内多个独立密码保护的本地档案，并确保 GitHub Pages 静态发布不包含个人数据。

**Architecture:** 新增一个聚焦的浏览器加密存储模块，使用 Web Crypto 派生并持有不可导出的 AES-GCM 密钥；应用启动时先显示账户门禁，解锁后再载入已有 SPA。迁移、保存、备份和发布清单都围绕同一密文信封实现；现有职位数据仍作为公开静态数据。

**Tech Stack:** 原生 JavaScript、Web Crypto API、localStorage、Node 22 `node:test`；不新增运行依赖或 CDN。

**Spec:** `docs/superpowers/specs/2026-10-08-local-encrypted-accounts-and-public-deployment.md`

## Global Constraints

- 每个档案使用 PBKDF2-HMAC-SHA-256（600,000 次）派生不可导出的 256-bit AES-GCM 密钥；每个档案使用独立随机盐，每次加密使用新 12 字节 IV。
- 密码不持久化；档案名和用户状态均在密文内；匿名档案索引不得包含明文个人字段。
- 浏览器不支持 Web Crypto、加密/存储失败或信封无法验证时，绝不回退到明文写入。
- 迁移必须先写入并解密回读验证，验证成功后才移除旧 `changping-jingkao-dashboard:v1` 明文键。
- 新导出为加密备份；旧 JSON 备份只在用户主动选择并确认后导入，导入后立即写成当前账户密文。
- GitHub Pages 只发布静态代码与经审核的公开研究数据；不得发布浏览器账户、备份、个人工作簿或 `data/raw/study_plan.xlsx`。
- 不上传用户数据、不创建服务器账号、不添加跨设备同步、运行时依赖或 CDN。

## Review Focus

- Web Crypto 不可用/非安全上下文时，账户创建、迁移和写入必须停止且不留下明文回退。
- 错误密码或被篡改的密文信封必须解锁失败，不能部分显示状态。
- 存储写入、回读或迁移任一步失败时，旧明文键必须保留且当前用户数据不得丢失。
- 快速连续编辑不能因异步加密乱序而把较旧快照覆盖到较新的状态。
- 一个档案的解锁、导入或保存不得读取或覆盖另一个档案；旧明文备份须经显式确认后导入。

---

### Task 1: 加密信封与会话密钥

**Files:**
- Create: `src/data/encryptedStore.js`
- Create: `test/encrypted-store.test.js`
- Modify: `scripts/build.mjs`

**Interfaces:**
- `createEncryptedAccount({ name, password, state, cryptoApi })` returns `{ id, envelope, session: { id, name, key, envelope } }`.
- `unlockEncryptedAccount({ id, envelope, password, cryptoApi })` returns `{ id, name, state, session: { id, name, key, envelope } }` or rejects without returning partial plaintext.
- `encryptAccountState({ state, session, cryptoApi })` returns a fresh envelope using the same profile salt and a new IV; the storage layer updates `session.envelope` only after its queued write succeeds.
- Envelope schema: `{ version: 1, kdf: "PBKDF2-SHA-256", iterations: 600000, cipher: "AES-GCM-256", salt, iv, ciphertext }`; binary fields use base64.

- [x] **Step 1: Write failing crypto tests** for round-trip; per-account salt/ID separation; fresh IV on each update; absent name/profile/score/plan text in serialized envelope; wrong password, modified ciphertext, unknown version and unavailable `cryptoApi` all fail.
- [x] **Step 2: Run `node --test test/encrypted-store.test.js`** and verify it fails because the module is absent.
- [x] **Step 3: Implement the three exported functions** with Web Crypto PBKDF2-HMAC-SHA-256 at 600,000 iterations, non-extractable AES-GCM-256 keys, 16-byte random salt and 12-byte random IV.
- [x] **Step 4: Add the module to the standalone bundle** in `scripts/build.mjs` and ensure build transformation removes only module syntax, not crypto functions.
- [x] **Step 5: Run `node --test test/encrypted-store.test.js` and `npm run build`**; require all crypto cases to pass and the standalone bundle to include the new module.

### Task 2: Isolated account index, saves and legacy migration

**Files:**
- Modify: `src/data/encryptedStore.js`
- Modify: `test/encrypted-store.test.js`

**Interfaces:**
- `listEncryptedAccounts(storage)` returns stable anonymous `{ id, slot }` entries from `changping-jingkao-dashboard:accounts:v1`.
- `createStoredAccount({ name, password, state, storage, cryptoApi })` writes an encrypted envelope and returns a live session.
- `openStoredAccount({ id, password, storage, cryptoApi })` reads only the selected envelope and returns its decrypted session.
- `saveStoredAccount({ session, state, storage, cryptoApi })` captures a snapshot, serializes writes in order, atomically replaces only that account envelope, and resolves only after updating `session.envelope`.
- `migrateLegacyAccount({ name, password, storage, cryptoApi })` migrates the existing V1 state and removes the old key only after decrypt-and-compare succeeds.

- [x] **Step 1: Add failing tests** for two-account isolation, anonymous index fields, account-list stability, persistence round-trip, ordered rapid saves, migration success, and write/readback failure retaining the V1 key.
- [x] **Step 2: Run the targeted Node test** and verify the new storage APIs fail.
- [x] **Step 3: Implement the account index and persistence APIs** using the existing V1 key only as migration input; storage and crypto failures must reject without plaintext fallback.
- [x] **Step 4: Run the targeted test** and verify account isolation, write ordering, and migration rollback cases pass.

### Task 3: Encrypted and legacy backup compatibility

**Files:**
- Modify: `src/data/backup.js`
- Modify: `test/backup.test.js`
- Modify: `test/encrypted-store.test.js`

**Interfaces:**
- `createEncryptedUserBackup({ id, envelope })` serializes the anonymous account ID and encrypted envelope with backup format/version metadata; the ID is required to verify AES-GCM additional authenticated data after restore.
- `parseEncryptedUserBackup(text)` validates format without attempting decryption.
- Existing `parseUserBackup(text)` remains the validator for explicitly selected legacy plaintext backups.

- [x] **Step 1: Write failing tests** proving new backups contain no personal fields, malformed/unknown versions are rejected, authenticated ciphertext tampering fails at unlock, and existing V1 JSON backup fixtures remain importable.
- [x] **Step 2: Run `node --test test/backup.test.js test/encrypted-store.test.js`** and observe the new encrypted-backup API failures.
- [x] **Step 3: Implement encrypted-envelope backup serialization/validation** while preserving the existing legacy backup parser.
- [x] **Step 4: Run both targeted test files** and verify both formats are distinguished and validated.

### Task 4: Account gate, migration and encrypted backup UI

**Files:**
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Modify: `scripts/build.mjs`
- Create or modify: `test/account-ui.test.js`
- Modify: `test/build-site.test.js`

**Interfaces:**
- Startup loads only the public dataset and anonymous encrypted-account index before showing create, unlock, or migration controls.
- The existing SPA renders only after `openStoredAccount` or a successful new-account/migration operation.
- Account actions expose create, unlock, lock/switch; no page or profile detail renders while locked.
- Saving any existing user action queues an encrypted snapshot; save confirmation appears only after persistence succeeds.
- New backup export serializes the active envelope; importing an encrypted backup asks for its password before preview and then replaces the active state only after confirmation. Importing a legacy backup requires its current existing confirmation path plus a plaintext-old-backup disclosure.

- [x] **Step 1: Add failing app tests** for empty-account creation, startup lock, correct/wrong unlock, lock/switch clearing rendered personal details, V1 migration prompt, successful migration, encrypted import, legacy import confirmation, and build output parity.
- [x] **Step 2: Run `node --test test/account-ui.test.js test/build-site.test.js`** and verify the account-gate and bundle assertions fail.
- [x] **Step 3: Integrate the encrypted store into `src/app.js`**; route persistence through the ordered encrypted save API and guard render/event handling until an account session exists.
- [x] **Step 4: Add focused account-gate and backup styles** in the current visual system without changing public research pages.
- [x] **Step 5: Update `scripts/build.mjs`** so the standalone `dist/index.html` uses the same async account initialization instead of bypassing it; continue bundling only `public/data.json` and app assets.
- [x] **Step 6: Run the focused app/build tests** and verify each account state and backup format behaves as specified.

### Task 5: Privacy and release-boundary regression

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `test/build-site.test.js`
- Modify: `README.md`
- Create or modify: `.gitignore`

**Interfaces:**
- GitHub Actions builds and publishes only `dist/` with the official Pages artifact/deployment actions; account localStorage keys are runtime-only and no account data is serialized into generated files.
- `.gitignore` keeps the original private workbook and generated/local artifacts out of source control while leaving them intact in the workspace.
- README explains browser-local accounts, password-loss consequences, same-browser-only scope, and how to use encrypted backups.

- [x] **Step 1: Add failing release tests** that assert no workbook, raw personal plan, plaintext account fixture, backup, secret, or credential is copied into the static artifact.
- [x] **Step 2: Run the focused release tests** and verify the unsafe fixture is detected.
- [x] **Step 3: Add the minimal `.gitignore` entries** for `data/raw/study_plan.xlsx`, `dist/`, browser backups and local artifacts; do not delete or move the source workbook.
- [x] **Step 4: Add `.github/workflows/pages.yml`** to install the lockfile, build, upload `dist/`, and deploy via GitHub Pages only after a push to the configured default branch.
- [x] **Step 5: Document actual account behavior and the no-server/no-sync model** in `README.md`.
- [x] **Step 6: Run `node --test test/build-site.test.js`, `npm run build`, and inspect the release file list**; require absence of all excluded material and a Pages artifact rooted at `dist/`.

## Plan Self-Review

- **Spec coverage:** account isolation and crypto are Task 1–2; migration is Task 2; encrypted/legacy backups are Task 3–4; UI, lock/switch, and visible failures are Task 4; static publication and source-control exclusion are Task 5. The actual push occurs only after the whole V2 site passes its acceptance gates.
- **Step clarity:** every implementation task starts with named failing tests and a scoped interface; no Git commit is included because the current checkout has no repository metadata and public publishing is explicitly deferred to final delivery.
- **Interface consistency:** Task 1 session `{ id, name, key, envelope }` is consumed by Task 2 save/open; Task 3 validates envelope backups; Task 4 owns the UI flow and production bundle.
- **Review Focus coverage:** each of the five failure classes has a corresponding Task 1, 2, 3, or 4 test.
- **Proportion:** five tasks cover one local storage subsystem and one static artifact boundary; live browser screenshots remain part of the V2 overall acceptance plan.
